import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { toUserResponse, type UserResponseDto } from '../users/dto/user-response.dto.js';
import { UserRole, UserStatus, TenantStatus } from '../generated/prisma/enums.js';
import type { Prisma, Tenant, User } from '../generated/prisma/client.js';
import type { JwtPayload } from '../common/types/jwt-payload.interface.js';
import { slugify } from '../tenants/tenant-slug.util.js';
import {
  DEFAULT_BUSINESS_HOURS,
  DEFAULT_MEMBERSHIP_POLICY,
  DEFAULT_NOTIFICATION_PREFERENCES,
  DEFAULT_PAYMENT_METHODS,
} from '../tenants/tenant-defaults.const.js';
import { PasswordService } from './password.service.js';
import { TokenService } from './token.service.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { RegisterBusinessDto } from './dto/register-business.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { ChangePasswordDto } from './dto/change-password.dto.js';

export interface RequestMeta {
  userAgent?: string;
  ipAddress?: string;
}

export interface AuthResult {
  user: UserResponseDto;
  accessToken: string;
  expiresIn: number;
  /** Raw refresh token — the controller puts this in the httpOnly cookie and discards it; never returned in a response body. */
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /** Joins an EXISTING gym as a MEMBER. To create a new gym, see registerBusiness(). */
  async register(dto: RegisterDto, meta: RequestMeta): Promise<AuthResult> {
    const tenant = await this.resolveTenantForRegistration(dto.tenantSlug);
    const passwordHash = await this.passwordService.hash(dto.password);

    const user = await this.usersService.create({
      tenantId: tenant.id,
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      role: UserRole.MEMBER,
    });

    return this.issueSession(user, meta);
  }

  /**
   * The owner-onboarding entry point: creates a brand-new gym (ONBOARDING
   * status, default settings) and its first user — an OWNER — atomically,
   * then signs them in immediately. Lives here rather than on TenantsService
   * specifically to reuse issueSession() (JWT signing + refresh-token
   * issuance) without exposing it outside AuthService, and to keep
   * TenantsModule from ever needing to depend on AuthModule — see
   * TenantsController's own comment on why gym *creation* is here.
   */
  async registerBusiness(dto: RegisterBusinessDto, meta: RequestMeta): Promise<AuthResult> {
    const existingOwner = await this.usersService.findByEmail(dto.ownerEmail);
    if (existingOwner) {
      throw new ConflictException('An account with this email already exists.');
    }

    const slug = await this.generateUniqueTenantSlug(dto.businessName);
    const passwordHash = await this.passwordService.hash(dto.ownerPassword);

    const owner = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: dto.businessName, slug, status: TenantStatus.ONBOARDING },
      });
      await tx.tenantSettings.create({
        data: {
          tenantId: tenant.id,
          businessHours: DEFAULT_BUSINESS_HOURS,
          membershipPolicy: DEFAULT_MEMBERSHIP_POLICY,
          paymentMethods: DEFAULT_PAYMENT_METHODS,
          notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
        } satisfies Prisma.TenantSettingsUncheckedCreateInput,
      });
      return tx.user.create({
        data: {
          tenantId: tenant.id,
          email: dto.ownerEmail.toLowerCase(),
          passwordHash,
          firstName: dto.ownerFirstName,
          lastName: dto.ownerLastName,
          phone: dto.ownerPhone,
          role: UserRole.OWNER,
          status: UserStatus.ACTIVE,
        },
      });
    });

    return this.issueSession(owner, meta);
  }

  async login(dto: LoginDto, meta: RequestMeta): Promise<AuthResult> {
    const user = await this.usersService.findByEmailWithTenantStatus(dto.email);
    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    // Reachable pre-password-check because an INVITED account's password is
    // an unknowable random value — there's no valid password to protect by
    // staying silent here, and telling them what to do next is genuinely
    // useful rather than a security leak.
    if (user.status === UserStatus.INVITED) {
      throw new ForbiddenException(
        'Your account setup is not complete yet — check your email for a setup link, or ask your gym owner to resend it.',
      );
    }

    const passwordMatches = await this.passwordService.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    // Checked only after a correct password, so a caller without the
    // password can't use either response to enumerate account/gym state.
    if (user.status === UserStatus.INACTIVE) {
      throw new ForbiddenException('This account is inactive. Contact your gym owner to restore access.');
    }
    this.assertTenantUsable(user.tenant);

    await this.usersService.touchLastLogin(user.id);
    return this.issueSession(user, meta);
  }

  async refresh(rawRefreshToken: string, meta: RequestMeta): Promise<AuthResult> {
    const tokenHash = this.tokenService.hashToken(rawRefreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored) {
      throw new UnauthorizedException('Session expired — please log in again.');
    }

    if (stored.revokedAt) {
      // A revoked token being presented again means either it was replaced
      // by a later refresh (normal rotation, and whoever holds this stale
      // token also holds a state cookie manager quirk — not necessarily
      // malicious) or it was stolen and the legitimate owner already
      // logged out. Either way the safe response is the same: burn every
      // session this user has and make them re-authenticate everywhere.
      await this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      this.logger.warn(`Reuse of a revoked refresh token detected for user ${stored.userId} — all sessions revoked.`);
      throw new UnauthorizedException('Session expired — please log in again.');
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired — please log in again.');
    }

    const user = await this.usersService.findByIdWithTenantStatus(stored.userId);
    if (!user || user.deletedAt || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('This account is no longer active.');
    }
    this.assertTenantUsable(user.tenant, UnauthorizedException);

    const result = await this.issueSession(user, meta);

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: {
        revokedAt: new Date(),
        replacedByTokenHash: this.tokenService.hashToken(result.refreshToken),
      },
    });

    return result;
  }

  /** Idempotent by design — logging out with an already-invalid token is a successful no-op, not an error. */
  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (!rawRefreshToken) {
      return;
    }
    const tokenHash = this.tokenService.hashToken(rawRefreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async getMe(userId: string): Promise<UserResponseDto> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    return toUserResponse(user);
  }

  /**
   * Always returns the same generic result whether or not the email
   * exists — the one place this API is deliberately silent, since telling
   * an anonymous caller "no account with that email" is a textbook
   * enumeration leak on a password-recovery endpoint.
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user || user.deletedAt || user.status === UserStatus.INACTIVE) {
      return;
    }

    const rawToken = this.tokenService.generateOpaqueToken();
    const tokenHash = this.tokenService.hashToken(rawToken);
    const ttlHours = this.configService.get<number>('jwt.resetTokenTtlHours')!;

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000),
      },
    });

    // No email provider is wired up yet (see backend/README.md) — logging
    // the link is the dev-visible stand-in until that integration lands.
    // It is never returned in the API response.
    this.logger.log(`Password reset requested for ${user.email} — token (dev only): ${rawToken}`);
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = this.tokenService.hashToken(rawToken);
    const stored = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      throw new BadRequestException('This reset link is invalid or has expired.');
    }

    const passwordHash = await this.passwordService.hash(newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: stored.userId },
        data: {
          passwordHash,
          // Completes the staff-invite flow the same token mechanism
          // covers — an INVITED user who successfully resets becomes ACTIVE.
          status: UserStatus.ACTIVE,
        },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: stored.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException();
    }

    const currentMatches = await this.passwordService.compare(dto.currentPassword, user.passwordHash);
    if (!currentMatches) {
      throw new BadRequestException('Current password is incorrect.');
    }

    const passwordHash = await this.passwordService.hash(dto.newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  refreshTokenTtlMs(): number {
    const days = this.configService.get<number>('jwt.refreshTokenTtlDays')!;
    return days * 24 * 60 * 60 * 1000;
  }

  /**
   * Resolves which gym a member-registration request joins. An explicit
   * slug (the eventual per-gym join-link/QR-code flow) always wins. Without
   * one, falling back to "the only gym that exists" keeps today's
   * single-tenant dev/demo flow working unchanged — but the moment a
   * second gym exists, guessing would risk silently signing someone up
   * under the wrong business, so it refuses instead. The public register
   * page doesn't collect a gym identifier yet; wiring that (and this
   * fallback with it) is frontend work for a later phase, once real
   * multi-tenant signup links exist.
   */
  private async resolveTenantForRegistration(tenantSlug?: string): Promise<Tenant> {
    if (tenantSlug) {
      const tenant = await this.prisma.tenant.findUnique({ where: { slug: tenantSlug } });
      if (!tenant || tenant.deletedAt) {
        throw new NotFoundException('No gym found for that link.');
      }
      this.assertTenantJoinable(tenant);
      return tenant;
    }

    const tenants = await this.prisma.tenant.findMany({ take: 2, orderBy: { createdAt: 'asc' } });
    if (tenants.length === 0) {
      // Genuinely a deployment/seed problem, not a user error — a fresh
      // database with no tenant at all means `npm run db:seed` was never
      // run (see backend/README.md).
      throw new BadRequestException(
        'No gym is set up on this server yet. Run the database seed before registering an account.',
      );
    }
    if (tenants.length > 1) {
      throw new BadRequestException(
        'Multiple gyms exist on this server — registration must specify which one to join.',
      );
    }
    this.assertTenantJoinable(tenants[0]!);
    return tenants[0]!;
  }

  private assertTenantJoinable(tenant: Tenant): void {
    if (tenant.status === TenantStatus.SUSPENDED || tenant.status === TenantStatus.INACTIVE) {
      throw new ForbiddenException('This gym is not currently accepting new members.');
    }
  }

  /**
   * Same SUSPENDED/INACTIVE check as assertTenantJoinable, for an EXISTING
   * account's session being (re)established (login/refresh) rather than a
   * new one being created — worded and typed as "no longer active" to match
   * the surrounding account-state messaging, and throwing whichever
   * exception the caller's other checks in the same flow already use.
   */
  private assertTenantUsable(
    tenant: { status: TenantStatus; deletedAt: Date | null },
    ExceptionType: new (message: string) => Error = ForbiddenException,
  ): void {
    if (tenant.deletedAt || tenant.status === TenantStatus.SUSPENDED || tenant.status === TenantStatus.INACTIVE) {
      throw new ExceptionType('This gym is not currently active. Contact your gym owner or support.');
    }
  }

  private async generateUniqueTenantSlug(businessName: string): Promise<string> {
    const base = slugify(businessName) || 'gym';
    let candidate = base;
    let suffix = 1;
    // Sequential by necessity — each check depends on the previous candidate.
    while (await this.prisma.tenant.findUnique({ where: { slug: candidate } })) {
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }
    return candidate;
  }

  private async issueSession(user: User, meta: RequestMeta): Promise<AuthResult> {
    const payload: JwtPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
    };
    const accessToken = this.jwtService.sign(payload);
    const expiresIn = this.configService.get<number>('jwt.accessTokenTtlSeconds')!;

    const rawRefreshToken = this.tokenService.generateOpaqueToken();
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.tokenService.hashToken(rawRefreshToken),
        expiresAt: new Date(Date.now() + this.refreshTokenTtlMs()),
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
      },
    });

    return {
      user: toUserResponse(user),
      accessToken,
      expiresIn,
      refreshToken: rawRefreshToken,
    };
  }
}
