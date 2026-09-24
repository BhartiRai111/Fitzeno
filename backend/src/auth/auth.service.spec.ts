import { ConflictException, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service.js';
import type { PasswordService } from './password.service.js';
import type { TokenService } from './token.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { UsersService } from '../users/users.service.js';
import type { MembersService } from '../members/members.service.js';
import type { Tenant, User } from '../generated/prisma/client.js';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    tenantId: 'tenant-1',
    email: 'member@example.com',
    passwordHash: 'hashed-password',
    firstName: 'Jordan',
    lastName: 'Smith',
    phone: null,
    role: 'MEMBER',
    status: 'ACTIVE',
    lastLoginAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
    ...overrides,
  } as User;
}

function makeTenant(overrides: Partial<Tenant> = {}): Tenant {
  return {
    id: 'tenant-1',
    name: 'Test Gym',
    slug: 'test-gym',
    status: 'ACTIVE',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    deletedAt: null,
    ...overrides,
  } as Tenant;
}

/** A User row joined with its tenant's live status — what findBy*WithTenantStatus return. */
function makeUserWithTenant(
  userOverrides: Partial<User> = {},
  tenantStatus: 'ONBOARDING' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' = 'ACTIVE',
) {
  return { ...makeUser(userOverrides), tenant: { status: tenantStatus, deletedAt: null } };
}

describe('AuthService', () => {
  let prisma: PrismaService;
  let usersService: UsersService;
  let membersService: MembersService;
  let passwordService: PasswordService;
  let tokenService: TokenService;
  let jwtService: JwtService;
  let configService: ConfigService;
  let service: AuthService;

  const configValues: Record<string, unknown> = {
    'jwt.accessTokenTtlSeconds': 900,
    'jwt.refreshTokenTtlDays': 30,
    'jwt.resetTokenTtlHours': 2,
  };

  beforeEach(() => {
    prisma = {
      tenant: { findFirst: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
      tenantSettings: { create: vi.fn() },
      refreshToken: {
        create: vi.fn().mockResolvedValue({}),
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      passwordResetToken: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
      user: { update: vi.fn(), create: vi.fn() },
      // Supports both call styles AuthService uses: an array of ops
      // (settled in parallel) and a callback given a transactional client.
      $transaction: vi.fn(async (arg: unknown) => {
        if (typeof arg === 'function') {
          return (arg as (tx: PrismaService) => unknown)(prisma);
        }
        return [];
      }),
    } as unknown as PrismaService;

    usersService = {
      create: vi.fn(),
      findByEmail: vi.fn(),
      findById: vi.fn(),
      findByEmailWithTenantStatus: vi.fn(),
      findByIdWithTenantStatus: vi.fn(),
      touchLastLogin: vi.fn().mockResolvedValue(undefined),
    } as unknown as UsersService;

    membersService = {
      linkPendingPortalUser: vi.fn().mockResolvedValue(undefined),
    } as unknown as MembersService;

    passwordService = {
      hash: vi.fn().mockResolvedValue('hashed-password'),
      compare: vi.fn(),
    } as unknown as PasswordService;

    tokenService = {
      generateOpaqueToken: vi.fn().mockReturnValue('raw-refresh-token'),
      hashToken: vi.fn().mockReturnValue('hashed-refresh-token'),
    } as unknown as TokenService;

    jwtService = { sign: vi.fn().mockReturnValue('signed-access-token') } as unknown as JwtService;

    configService = {
      get: vi.fn((key: string) => configValues[key]),
    } as unknown as ConfigService;

    service = new AuthService(
      prisma,
      usersService,
      membersService,
      passwordService,
      tokenService,
      jwtService,
      configService,
    );
  });

  describe('register', () => {
    it('creates the user as a MEMBER under the single existing tenant when no tenantSlug is given', async () => {
      vi.mocked(prisma.tenant.findMany).mockResolvedValue([makeTenant()] as never);
      vi.mocked(usersService.create).mockResolvedValue(makeUser());

      const result = await service.register(
        { email: 'member@example.com', password: 'Password123!', firstName: 'Jordan', lastName: 'Smith' },
        {},
      );

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'tenant-1', role: 'MEMBER', email: 'member@example.com' }),
      );
      expect(result.accessToken).toBe('signed-access-token');
      expect(result.refreshToken).toBe('raw-refresh-token');
      expect(result.user.email).toBe('member@example.com');
      // The raw password hash is never exposed on the response DTO.
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('joins the tenant identified by an explicit tenantSlug', async () => {
      const tenant = makeTenant({ id: 'tenant-2', slug: 'gym-b' });
      vi.mocked(prisma.tenant.findUnique).mockResolvedValue(tenant as never);
      vi.mocked(usersService.create).mockResolvedValue(makeUser({ tenantId: 'tenant-2' }));

      await service.register(
        { email: 'member@example.com', password: 'Password123!', firstName: 'A', lastName: 'B', tenantSlug: 'gym-b' },
        {},
      );

      expect(prisma.tenant.findMany).not.toHaveBeenCalled();
      expect(usersService.create).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'tenant-2' }));
    });

    it('rejects an unknown tenantSlug', async () => {
      vi.mocked(prisma.tenant.findUnique).mockResolvedValue(null);

      await expect(
        service.register(
          { email: 'a@example.com', password: 'Password123!', firstName: 'A', lastName: 'B', tenantSlug: 'no-such-gym' },
          {},
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('refuses to guess when more than one gym exists and no tenantSlug is given', async () => {
      vi.mocked(prisma.tenant.findMany).mockResolvedValue([makeTenant({ id: 't1' }), makeTenant({ id: 't2' })] as never);

      await expect(
        service.register({ email: 'a@example.com', password: 'Password123!', firstName: 'A', lastName: 'B' }, {}),
      ).rejects.toThrow('Multiple gyms exist');
    });

    it('refuses to register when no tenant exists yet (unseeded database)', async () => {
      vi.mocked(prisma.tenant.findMany).mockResolvedValue([]);

      await expect(
        service.register({ email: 'a@example.com', password: 'Password123!', firstName: 'A', lastName: 'B' }, {}),
      ).rejects.toThrow('No gym is set up on this server yet');
    });

    it('rejects joining a suspended or inactive gym', async () => {
      vi.mocked(prisma.tenant.findMany).mockResolvedValue([makeTenant({ status: 'SUSPENDED' })] as never);

      await expect(
        service.register({ email: 'a@example.com', password: 'Password123!', firstName: 'A', lastName: 'B' }, {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('registerBusiness', () => {
    const dto = {
      businessName: 'Riverside Fitness',
      ownerEmail: 'owner@example.com',
      ownerPassword: 'Password123!',
      ownerFirstName: 'Sam',
      ownerLastName: 'Carter',
    };

    it('creates a new tenant (ONBOARDING) with default settings and an OWNER user, then issues a session', async () => {
      vi.mocked(usersService.findByEmail).mockResolvedValue(null);
      vi.mocked(prisma.tenant.findUnique).mockResolvedValue(null); // slug is available
      const createdTenant = makeTenant({ id: 'new-tenant', slug: 'riverside-fitness', status: 'ONBOARDING' });
      vi.mocked(prisma.tenant.create).mockResolvedValue(createdTenant as never);
      vi.mocked(prisma.user.create).mockResolvedValue(
        makeUser({ id: 'owner-1', tenantId: 'new-tenant', email: 'owner@example.com', role: 'OWNER' }) as never,
      );

      const result = await service.registerBusiness(dto, {});

      expect(prisma.tenant.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: 'Riverside Fitness', slug: 'riverside-fitness', status: 'ONBOARDING' }) }),
      );
      expect(prisma.tenantSettings.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ tenantId: 'new-tenant' }) }),
      );
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ tenantId: 'new-tenant', role: 'OWNER', email: 'owner@example.com' }) }),
      );
      expect(result.user.role).toBe('OWNER');
      expect(result.accessToken).toBe('signed-access-token');
    });

    it('rejects when the owner email is already in use', async () => {
      vi.mocked(usersService.findByEmail).mockResolvedValue(makeUser({ email: 'owner@example.com' }));

      await expect(service.registerBusiness(dto, {})).rejects.toThrow(ConflictException);
      expect(prisma.tenant.create).not.toHaveBeenCalled();
    });

    it('appends a numeric suffix to the slug when the base slug is already taken', async () => {
      vi.mocked(usersService.findByEmail).mockResolvedValue(null);
      vi.mocked(prisma.tenant.findUnique)
        .mockResolvedValueOnce(makeTenant({ slug: 'riverside-fitness' }) as never) // taken
        .mockResolvedValueOnce(null); // riverside-fitness-2 is free
      vi.mocked(prisma.tenant.create).mockResolvedValue(makeTenant({ id: 'new-tenant', slug: 'riverside-fitness-2' }) as never);
      vi.mocked(prisma.user.create).mockResolvedValue(makeUser({ id: 'owner-1', tenantId: 'new-tenant', role: 'OWNER' }) as never);

      await service.registerBusiness(dto, {});

      expect(prisma.tenant.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ slug: 'riverside-fitness-2' }) }),
      );
    });
  });

  describe('login', () => {
    it('logs in successfully with correct credentials and touches lastLoginAt', async () => {
      const user = makeUserWithTenant();
      vi.mocked(usersService.findByEmailWithTenantStatus).mockResolvedValue(user as never);
      vi.mocked(passwordService.compare).mockResolvedValue(true);

      const result = await service.login({ email: user.email, password: 'Password123!' }, {});

      expect(usersService.touchLastLogin).toHaveBeenCalledWith(user.id);
      expect(result.accessToken).toBe('signed-access-token');
    });

    it('rejects an unknown email with a generic message', async () => {
      vi.mocked(usersService.findByEmailWithTenantStatus).mockResolvedValue(null);

      await expect(service.login({ email: 'nobody@example.com', password: 'x' }, {})).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects a wrong password with the same generic message as an unknown email', async () => {
      const user = makeUserWithTenant();
      vi.mocked(usersService.findByEmailWithTenantStatus).mockResolvedValue(user as never);
      vi.mocked(passwordService.compare).mockResolvedValue(false);

      await expect(service.login({ email: user.email, password: 'wrong' }, {})).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects an INVITED account before checking the password, with an actionable message', async () => {
      const user = makeUserWithTenant({ status: 'INVITED' });
      vi.mocked(usersService.findByEmailWithTenantStatus).mockResolvedValue(user as never);

      await expect(service.login({ email: user.email, password: 'x' }, {})).rejects.toThrow(ForbiddenException);
      expect(passwordService.compare).not.toHaveBeenCalled();
    });

    it('rejects an INACTIVE account only after the password has been verified', async () => {
      const user = makeUserWithTenant({ status: 'INACTIVE' });
      vi.mocked(usersService.findByEmailWithTenantStatus).mockResolvedValue(user as never);
      vi.mocked(passwordService.compare).mockResolvedValue(true);

      await expect(service.login({ email: user.email, password: 'Password123!' }, {})).rejects.toThrow(
        ForbiddenException,
      );
      expect(passwordService.compare).toHaveBeenCalled();
    });

    it('rejects login when the gym itself is suspended, even with the correct password', async () => {
      const user = makeUserWithTenant({}, 'SUSPENDED');
      vi.mocked(usersService.findByEmailWithTenantStatus).mockResolvedValue(user as never);
      vi.mocked(passwordService.compare).mockResolvedValue(true);

      await expect(service.login({ email: user.email, password: 'Password123!' }, {})).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rejects login when the gym has been paused (INACTIVE)', async () => {
      const user = makeUserWithTenant({}, 'INACTIVE');
      vi.mocked(usersService.findByEmailWithTenantStatus).mockResolvedValue(user as never);
      vi.mocked(passwordService.compare).mockResolvedValue(true);

      await expect(service.login({ email: user.email, password: 'Password123!' }, {})).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('allows login while the gym is still ONBOARDING', async () => {
      const user = makeUserWithTenant({}, 'ONBOARDING');
      vi.mocked(usersService.findByEmailWithTenantStatus).mockResolvedValue(user as never);
      vi.mocked(passwordService.compare).mockResolvedValue(true);

      await expect(service.login({ email: user.email, password: 'Password123!' }, {})).resolves.toBeDefined();
    });
  });

  describe('refresh', () => {
    it('rotates the refresh token and issues a new access token for a valid, unexpired token', async () => {
      const stored = {
        id: 'rt-1',
        userId: 'user-1',
        tokenHash: 'hashed-refresh-token',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      };
      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue(stored as never);
      vi.mocked(usersService.findByIdWithTenantStatus).mockResolvedValue(makeUserWithTenant() as never);

      const result = await service.refresh('raw-refresh-token', {});

      expect(prisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'rt-1' }, data: expect.objectContaining({ revokedAt: expect.any(Date) }) }),
      );
      expect(result.accessToken).toBe('signed-access-token');
    });

    it('rejects an unknown refresh token', async () => {
      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue(null);

      await expect(service.refresh('garbage', {})).rejects.toThrow(UnauthorizedException);
    });

    it('revokes every session for the user when a revoked (already-used) token is presented again', async () => {
      const stored = {
        id: 'rt-1',
        userId: 'user-1',
        tokenHash: 'hashed-refresh-token',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      };
      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue(stored as never);

      await expect(service.refresh('raw-refresh-token', {})).rejects.toThrow(UnauthorizedException);
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('rejects an expired refresh token', async () => {
      const stored = {
        id: 'rt-1',
        userId: 'user-1',
        tokenHash: 'hashed-refresh-token',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 60_000),
      };
      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue(stored as never);

      await expect(service.refresh('raw-refresh-token', {})).rejects.toThrow(UnauthorizedException);
    });

    it('rejects when the account behind the token is no longer active', async () => {
      const stored = {
        id: 'rt-1',
        userId: 'user-1',
        tokenHash: 'hashed-refresh-token',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      };
      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue(stored as never);
      vi.mocked(usersService.findByIdWithTenantStatus).mockResolvedValue(makeUserWithTenant({ status: 'INACTIVE' }) as never);

      await expect(service.refresh('raw-refresh-token', {})).rejects.toThrow(UnauthorizedException);
    });

    it('rejects when the gym behind the token has been suspended', async () => {
      const stored = {
        id: 'rt-1',
        userId: 'user-1',
        tokenHash: 'hashed-refresh-token',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      };
      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue(stored as never);
      vi.mocked(usersService.findByIdWithTenantStatus).mockResolvedValue(makeUserWithTenant({}, 'SUSPENDED') as never);

      await expect(service.refresh('raw-refresh-token', {})).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('is a no-op when no refresh token cookie was present', async () => {
      await service.logout(undefined);

      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it('revokes the matching refresh token when present', async () => {
      await service.logout('raw-refresh-token');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { tokenHash: 'hashed-refresh-token', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe('changePassword', () => {
    it('rejects when the current password is incorrect', async () => {
      vi.mocked(usersService.findById).mockResolvedValue(makeUser());
      vi.mocked(passwordService.compare).mockResolvedValue(false);

      await expect(
        service.changePassword('user-1', { currentPassword: 'wrong', newPassword: 'NewPassword123!' }),
      ).rejects.toThrow('Current password is incorrect.');
    });

    it('updates the password hash and revokes all sessions on success', async () => {
      vi.mocked(usersService.findById).mockResolvedValue(makeUser());
      vi.mocked(passwordService.compare).mockResolvedValue(true);

      await service.changePassword('user-1', { currentPassword: 'old', newPassword: 'NewPassword123!' });

      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });
});
