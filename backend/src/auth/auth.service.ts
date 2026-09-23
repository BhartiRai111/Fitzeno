import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { toUserResponse, type UserResponseDto } from '../users/dto/user-response.dto.js';
import { UserRole, UserStatus } from '../generated/prisma/enums.js';
import type { User } from '../generated/prisma/client.js';
import type { JwtPayload } from '../common/types/jwt-payload.interface.js';
import { PasswordService } from './password.service.js';
import { TokenService } from './token.service.js';
import type { RegisterDto } from './dto/register.dto.js';
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

  async register(dto: RegisterDto, meta: RequestMeta): Promise<AuthResult> {
    const tenant = await this.resolveDefaultTenant();
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

  async login(dto: LoginDto, meta: RequestMeta): Promise<AuthResult> {
    const user = await this.usersService.findByEmail(dto.email);
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
    // password can't use this response to enumerate which accounts are
    // inactive.
    if (user.status === UserStatus.INACTIVE) {
      throw new ForbiddenException('This account is inactive. Contact your gym owner to restore access.');
    }

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

    const user = await this.usersService.findById(stored.userId);
    if (!user || user.deletedAt || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('This account is no longer active.');
    }

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

  private async resolveDefaultTenant() {
    const tenant = await this.prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!tenant) {
      // Genuinely a deployment/seed problem, not a user error — a fresh
      // database with no tenant at all means `npm run db:seed` was never
      // run (see backend/README.md).
      throw new BadRequestException(
        'No gym is set up on this server yet. Run the database seed before registering an account.',
      );
    }
    return tenant;
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
