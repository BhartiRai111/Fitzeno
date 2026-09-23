import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service.js';
import type { PasswordService } from './password.service.js';
import type { TokenService } from './token.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { UsersService } from '../users/users.service.js';
import type { User } from '../generated/prisma/client.js';

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

describe('AuthService', () => {
  let prisma: PrismaService;
  let usersService: UsersService;
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
      tenant: { findFirst: vi.fn() },
      refreshToken: {
        create: vi.fn().mockResolvedValue({}),
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      passwordResetToken: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
      user: { update: vi.fn() },
      $transaction: vi.fn().mockResolvedValue([]),
    } as unknown as PrismaService;

    usersService = {
      create: vi.fn(),
      findByEmail: vi.fn(),
      findById: vi.fn(),
      touchLastLogin: vi.fn().mockResolvedValue(undefined),
    } as unknown as UsersService;

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

    service = new AuthService(prisma, usersService, passwordService, tokenService, jwtService, configService);
  });

  describe('register', () => {
    it('creates the user as a MEMBER under the single existing tenant and issues a session', async () => {
      vi.mocked(prisma.tenant.findFirst).mockResolvedValue({ id: 'tenant-1' } as never);
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

    it('refuses to register when no tenant exists yet (unseeded database)', async () => {
      vi.mocked(prisma.tenant.findFirst).mockResolvedValue(null);

      await expect(
        service.register({ email: 'a@example.com', password: 'Password123!', firstName: 'A', lastName: 'B' }, {}),
      ).rejects.toThrow('No gym is set up on this server yet');
    });
  });

  describe('login', () => {
    it('logs in successfully with correct credentials and touches lastLoginAt', async () => {
      const user = makeUser();
      vi.mocked(usersService.findByEmail).mockResolvedValue(user);
      vi.mocked(passwordService.compare).mockResolvedValue(true);

      const result = await service.login({ email: user.email, password: 'Password123!' }, {});

      expect(usersService.touchLastLogin).toHaveBeenCalledWith(user.id);
      expect(result.accessToken).toBe('signed-access-token');
    });

    it('rejects an unknown email with a generic message', async () => {
      vi.mocked(usersService.findByEmail).mockResolvedValue(null);

      await expect(service.login({ email: 'nobody@example.com', password: 'x' }, {})).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects a wrong password with the same generic message as an unknown email', async () => {
      const user = makeUser();
      vi.mocked(usersService.findByEmail).mockResolvedValue(user);
      vi.mocked(passwordService.compare).mockResolvedValue(false);

      await expect(service.login({ email: user.email, password: 'wrong' }, {})).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects an INVITED account before checking the password, with an actionable message', async () => {
      const user = makeUser({ status: 'INVITED' });
      vi.mocked(usersService.findByEmail).mockResolvedValue(user);

      await expect(service.login({ email: user.email, password: 'x' }, {})).rejects.toThrow(ForbiddenException);
      expect(passwordService.compare).not.toHaveBeenCalled();
    });

    it('rejects an INACTIVE account only after the password has been verified', async () => {
      const user = makeUser({ status: 'INACTIVE' });
      vi.mocked(usersService.findByEmail).mockResolvedValue(user);
      vi.mocked(passwordService.compare).mockResolvedValue(true);

      await expect(service.login({ email: user.email, password: 'Password123!' }, {})).rejects.toThrow(
        ForbiddenException,
      );
      expect(passwordService.compare).toHaveBeenCalled();
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
      vi.mocked(usersService.findById).mockResolvedValue(makeUser());

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
      vi.mocked(usersService.findById).mockResolvedValue(makeUser({ status: 'INACTIVE' }));

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
