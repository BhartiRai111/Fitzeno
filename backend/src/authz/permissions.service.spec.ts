import { describe, expect, it, vi } from 'vitest';
import { PermissionsService } from './permissions.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

function makePrismaStub(overrides: { area: string; level: string }[] = []) {
  return {
    permissionOverride: {
      findMany: vi.fn().mockResolvedValue(overrides),
    },
  } as unknown as PrismaService;
}

describe('PermissionsService', () => {
  describe('mergeOverrides', () => {
    it("falls back to the role's default permissions when there are no overrides", () => {
      const service = new PermissionsService(makePrismaStub());

      const effective = service.mergeOverrides('TRAINER', []);

      expect(effective.BOOKINGS).toBe('MANAGE');
      expect(effective.FINANCE).toBe('NONE');
    });

    it('lets a per-user override win over the role default', () => {
      const service = new PermissionsService(makePrismaStub());

      const effective = service.mergeOverrides('TRAINER', [{ area: 'FINANCE', level: 'VIEW' } as never]);

      expect(effective.FINANCE).toBe('VIEW');
      // Untouched areas still fall back to the role default.
      expect(effective.BOOKINGS).toBe('MANAGE');
    });

    it('a MEMBER has no access to any area by default', () => {
      const service = new PermissionsService(makePrismaStub());

      const effective = service.mergeOverrides('MEMBER', []);

      expect(Object.values(effective).every((level) => level === 'NONE')).toBe(true);
    });
  });

  describe('getEffectivePermissions', () => {
    it('loads overrides for the given user from the database and merges them', async () => {
      const prisma = makePrismaStub([{ area: 'STAFF', level: 'MANAGE' }]);
      const service = new PermissionsService(prisma);

      const effective = await service.getEffectivePermissions('user-1', 'FRONT_DESK');

      expect(prisma.permissionOverride.findMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
      expect(effective.STAFF).toBe('MANAGE');
    });
  });

  describe('hasPermission', () => {
    it('returns true when the effective level meets the required minimum', async () => {
      const service = new PermissionsService(makePrismaStub());

      await expect(service.hasPermission('user-1', 'OWNER', 'FINANCE', 'MANAGE')).resolves.toBe(true);
    });

    it('returns false when the effective level is below the required minimum', async () => {
      const service = new PermissionsService(makePrismaStub());

      await expect(service.hasPermission('user-1', 'MEMBER', 'FINANCE', 'VIEW')).resolves.toBe(false);
    });

    it('VIEW satisfies a VIEW requirement, and MANAGE satisfies a VIEW requirement', () => {
      const service = new PermissionsService(makePrismaStub());

      expect(service.levelSatisfies('VIEW', 'VIEW')).toBe(true);
      expect(service.levelSatisfies('MANAGE', 'VIEW')).toBe(true);
      expect(service.levelSatisfies('NONE', 'VIEW')).toBe(false);
    });
  });
});
