import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationsService } from './notifications.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

function makeNotification(overrides: Record<string, unknown> = {}) {
  return {
    id: 'notif-1',
    tenantId: 'tenant-1',
    recipientUserId: 'user-1',
    category: 'BOOKING',
    priority: 'MEDIUM',
    title: 'Class booking confirmed',
    message: "You're booked in.",
    relatedEntityType: 'class_booking',
    relatedEntityId: 'booking-1',
    actionUrl: '/portal/bookings',
    dedupKey: null,
    readAt: null,
    createdAt: new Date(),
    expiresAt: null,
    ...overrides,
  };
}

describe('NotificationsService', () => {
  let prisma: PrismaService;
  let service: NotificationsService;

  beforeEach(() => {
    prisma = {
      notification: {
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn(),
        count: vi.fn().mockResolvedValue(0),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      notificationPreference: {
        findMany: vi.fn().mockResolvedValue([]),
        upsert: vi.fn(),
      },
      member: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      user: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      $transaction: vi.fn(async (arg: unknown) =>
        typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(prisma) : Promise.all(arg as Promise<unknown>[]),
      ),
    } as unknown as PrismaService;

    service = new NotificationsService(prisma);
  });

  describe('notify / notifyUser', () => {
    it('creates a notification row for the recipient', async () => {
      await service.notifyUser('tenant-1', 'user-1', {
        category: 'BOOKING' as never,
        title: 'Test',
        message: 'Test message',
      });
      expect(prisma.notification.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [expect.objectContaining({ tenantId: 'tenant-1', recipientUserId: 'user-1', category: 'BOOKING' })],
          skipDuplicates: true,
        }),
      );
    });

    it('does not create a row when the recipient has disabled that category', async () => {
      vi.mocked(prisma.notificationPreference.findMany).mockResolvedValue([
        { userId: 'user-1', category: 'BOOKING', enabled: false },
      ] as never);

      await service.notifyUser('tenant-1', 'user-1', { category: 'BOOKING' as never, title: 'Test', message: 'Test' });

      expect(prisma.notification.createMany).not.toHaveBeenCalled();
    });

    it('always creates a row for a non-toggleable category regardless of preference rows', async () => {
      vi.mocked(prisma.notificationPreference.findMany).mockResolvedValue([
        { userId: 'user-1', category: 'SYSTEM', enabled: false },
      ] as never);

      await service.notifyUser('tenant-1', 'user-1', { category: 'SYSTEM' as never, title: 'Test', message: 'Test' });

      expect(prisma.notification.createMany).toHaveBeenCalled();
      // SYSTEM never needs the preference table consulted at all.
      expect(prisma.notificationPreference.findMany).not.toHaveBeenCalled();
    });

    it('no-ops with an empty recipient list', async () => {
      await service.notify('tenant-1', [], { category: 'BOOKING' as never, title: 'x', message: 'y' });
      expect(prisma.notification.createMany).not.toHaveBeenCalled();
    });
  });

  describe('notifyMember / notifyMembers', () => {
    it('no-ops silently when the member has no linked login', async () => {
      vi.mocked(prisma.member.findMany).mockResolvedValue([]);
      await service.notifyMember('tenant-1', 'member-1', { category: 'BOOKING' as never, title: 'x', message: 'y' });
      expect(prisma.notification.createMany).not.toHaveBeenCalled();
    });

    it('resolves the linked userId and creates a notification', async () => {
      vi.mocked(prisma.member.findMany).mockResolvedValue([{ userId: 'user-1' }] as never);
      await service.notifyMember('tenant-1', 'member-1', { category: 'BOOKING' as never, title: 'x', message: 'y' });
      expect(prisma.notification.createMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: [expect.objectContaining({ recipientUserId: 'user-1' })] }),
      );
    });

    it('resolves multiple members, dropping any without a linked login', async () => {
      vi.mocked(prisma.member.findMany).mockResolvedValue([{ userId: 'user-1' }, { userId: 'user-2' }] as never);
      await service.notifyMembers('tenant-1', ['member-1', 'member-2', 'member-3'], { category: 'CLASS' as never, title: 'x', message: 'y' });
      const call = vi.mocked(prisma.notification.createMany).mock.calls[0]![0] as { data: { recipientUserId: string }[] };
      expect(call.data.map((d) => d.recipientUserId).sort()).toEqual(['user-1', 'user-2']);
    });
  });

  describe('notifyUsersByRoles', () => {
    it('queries active users in the given roles and notifies them', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([{ id: 'owner-1' }, { id: 'manager-1' }] as never);
      await service.notifyUsersByRoles('tenant-1', ['OWNER', 'MANAGER'] as never, { category: 'PAYMENT' as never, title: 'x', message: 'y' });
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: 'tenant-1', role: { in: ['OWNER', 'MANAGER'] }, status: 'ACTIVE' } }),
      );
      const call = vi.mocked(prisma.notification.createMany).mock.calls[0]![0] as { data: unknown[] };
      expect(call.data).toHaveLength(2);
    });
  });

  describe('listOwn', () => {
    it('scopes the query to tenantId + recipientUserId', async () => {
      await service.listOwn('tenant-1', 'user-1', { page: 1, limit: 20, sortOrder: 'desc', skip: 0 } as never);
      const call = vi.mocked(prisma.notification.findMany).mock.calls[0]![0] as { where: { tenantId: string; recipientUserId: string } };
      expect(call.where.tenantId).toBe('tenant-1');
      expect(call.where.recipientUserId).toBe('user-1');
    });

    it('filters unread-only when unread=true', async () => {
      await service.listOwn('tenant-1', 'user-1', { page: 1, limit: 20, sortOrder: 'desc', skip: 0, unread: true } as never);
      const call = vi.mocked(prisma.notification.findMany).mock.calls[0]![0] as { where: { readAt: null } };
      expect(call.where.readAt).toBeNull();
    });
  });

  describe('unreadCount', () => {
    it('counts only unread notifications for the caller', async () => {
      vi.mocked(prisma.notification.count).mockResolvedValue(3);
      const count = await service.unreadCount('tenant-1', 'user-1');
      expect(count).toBe(3);
      expect(prisma.notification.count).toHaveBeenCalledWith({ where: { tenantId: 'tenant-1', recipientUserId: 'user-1', readAt: null } });
    });
  });

  describe('findOwnByIdInTenant', () => {
    it('throws NotFoundException for a notification belonging to a different user (or tenant)', async () => {
      vi.mocked(prisma.notification.findFirst).mockResolvedValue(null);
      await expect(service.findOwnByIdInTenant('tenant-1', 'user-1', 'notif-1')).rejects.toThrow(NotFoundException);
    });

    it('returns the notification when it belongs to the caller', async () => {
      vi.mocked(prisma.notification.findFirst).mockResolvedValue(makeNotification() as never);
      const result = await service.findOwnByIdInTenant('tenant-1', 'user-1', 'notif-1');
      expect(result.id).toBe('notif-1');
      expect(result.read).toBe(false);
    });
  });

  describe('markRead', () => {
    it('marks an unread notification as read', async () => {
      vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 1 } as never);
      vi.mocked(prisma.notification.findFirst).mockResolvedValue(makeNotification({ readAt: new Date() }) as never);

      const result = await service.markRead('tenant-1', 'user-1', 'notif-1');
      expect(result.read).toBe(true);
    });

    it('is idempotent when the notification is already read', async () => {
      vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 0 } as never);
      vi.mocked(prisma.notification.findFirst).mockResolvedValue(makeNotification({ readAt: new Date() }) as never);

      const result = await service.markRead('tenant-1', 'user-1', 'notif-1');
      expect(result.read).toBe(true);
    });

    it('throws NotFoundException when the notification does not belong to the caller', async () => {
      vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 0 } as never);
      vi.mocked(prisma.notification.findFirst).mockResolvedValue(null);

      await expect(service.markRead('tenant-1', 'user-1', 'notif-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAllRead', () => {
    it('returns the count of notifications updated', async () => {
      vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 5 } as never);
      const result = await service.markAllRead('tenant-1', 'user-1');
      expect(result).toEqual({ updated: 5 });
    });
  });

  describe('getPreferences / updatePreferences', () => {
    it('returns the categories available to a MEMBER, defaulting to enabled', async () => {
      vi.mocked(prisma.notificationPreference.findMany).mockResolvedValue([]);
      const prefs = await service.getPreferences('tenant-1', 'user-1', 'MEMBER' as never);
      expect(prefs.some((p) => p.category === 'BOOKING')).toBe(true);
      expect(prefs.every((p) => p.enabled)).toBe(true);
      // LEAD is not a member-relevant category.
      expect(prefs.some((p) => p.category === 'LEAD')).toBe(false);
    });

    it('reflects a stored override', async () => {
      vi.mocked(prisma.notificationPreference.findMany).mockResolvedValue([
        { category: 'PROMOTION', enabled: false },
      ] as never);
      const prefs = await service.getPreferences('tenant-1', 'user-1', 'MEMBER' as never);
      expect(prefs.find((p) => p.category === 'PROMOTION')?.enabled).toBe(false);
    });

    it('rejects a category not available to the caller\'s role', async () => {
      await expect(
        service.updatePreferences('tenant-1', 'user-1', 'MEMBER' as never, {
          preferences: [{ category: 'STAFF' as never, enabled: false }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects disabling a non-toggleable category', async () => {
      await expect(
        service.updatePreferences('tenant-1', 'user-1', 'OWNER' as never, {
          preferences: [{ category: 'SYSTEM' as never, enabled: false }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('upserts a valid preference change', async () => {
      vi.mocked(prisma.notificationPreference.findMany).mockResolvedValue([{ category: 'PROMOTION', enabled: false }] as never);
      await service.updatePreferences('tenant-1', 'user-1', 'MEMBER' as never, {
        preferences: [{ category: 'PROMOTION' as never, enabled: false }],
      });
      expect(prisma.notificationPreference.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_category: { userId: 'user-1', category: 'PROMOTION' } },
          update: { enabled: false },
        }),
      );
    });
  });
});
