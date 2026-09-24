import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnnouncementsService } from './announcements.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { NotificationsService } from './notifications.service.js';

function makeAnnouncement(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ann-1',
    tenantId: 'tenant-1',
    title: 'Front desk closing early',
    message: "We'll close early Friday.",
    priority: 'MEDIUM',
    audience: 'ALL_MEMBERS',
    audiencePlanId: null,
    recipientCount: 2,
    sentByUserId: 'owner-1',
    createdAt: new Date(),
    sentBy: { id: 'owner-1', firstName: 'Sam', lastName: 'Carter' },
    ...overrides,
  };
}

describe('AnnouncementsService', () => {
  let prisma: PrismaService;
  let notificationsService: NotificationsService;
  let service: AnnouncementsService;

  beforeEach(() => {
    prisma = {
      member: { findMany: vi.fn().mockResolvedValue([]) },
      memberMembership: { findMany: vi.fn().mockResolvedValue([]) },
      user: { findMany: vi.fn().mockResolvedValue([]) },
      announcement: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
      $transaction: vi.fn(async (arg: unknown) =>
        typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(prisma) : Promise.all(arg as Promise<unknown>[]),
      ),
    } as unknown as PrismaService;

    notificationsService = { notify: vi.fn().mockResolvedValue(undefined) } as unknown as NotificationsService;
    service = new AnnouncementsService(prisma, notificationsService);
  });

  describe('resolveRecipientUserIds (via getAudienceCount)', () => {
    it('ALL_MEMBERS resolves every member with a linked login', async () => {
      vi.mocked(prisma.member.findMany).mockResolvedValue([{ userId: 'u1' }, { userId: 'u2' }] as never);
      const result = await service.getAudienceCount('tenant-1', 'ALL_MEMBERS' as never);
      expect(result.count).toBe(2);
      expect(prisma.member.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: 'tenant-1', userId: { not: null } } }),
      );
    });

    it('ACTIVE_MEMBERS additionally filters by status', async () => {
      vi.mocked(prisma.member.findMany).mockResolvedValue([{ userId: 'u1' }] as never);
      await service.getAudienceCount('tenant-1', 'ACTIVE_MEMBERS' as never);
      const call = vi.mocked(prisma.member.findMany).mock.calls[0]![0] as { where: { status: string } };
      expect(call.where.status).toBe('ACTIVE');
    });

    it('PLAN_MEMBERS requires planId', async () => {
      await expect(service.getAudienceCount('tenant-1', 'PLAN_MEMBERS' as never)).rejects.toThrow(BadRequestException);
    });

    it('PLAN_MEMBERS resolves members currently on that plan', async () => {
      vi.mocked(prisma.memberMembership.findMany).mockResolvedValue([{ member: { userId: 'u1' } }] as never);
      const result = await service.getAudienceCount('tenant-1', 'PLAN_MEMBERS' as never, 'plan-1');
      expect(result.count).toBe(1);
      const call = vi.mocked(prisma.memberMembership.findMany).mock.calls[0]![0] as { where: { planId: string } };
      expect(call.where.planId).toBe('plan-1');
    });

    it('ALL_TRAINERS resolves active users with role TRAINER', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([{ id: 'trainer-1' }] as never);
      const result = await service.getAudienceCount('tenant-1', 'ALL_TRAINERS' as never);
      expect(result.count).toBe(1);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: 'tenant-1', role: 'TRAINER', status: 'ACTIVE' } }),
      );
    });

    it('TRAINERS_AND_STAFF resolves trainer + manager + front-desk roles', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([{ id: 'a' }, { id: 'b' }] as never);
      await service.getAudienceCount('tenant-1', 'TRAINERS_AND_STAFF' as never);
      const call = vi.mocked(prisma.user.findMany).mock.calls[0]![0] as { where: { role: { in: string[] } } };
      expect(call.where.role.in.sort()).toEqual(['FRONT_DESK', 'MANAGER', 'TRAINER'].sort());
    });

    it('SPECIFIC_MEMBERS requires memberIds', async () => {
      await expect(service.getAudienceCount('tenant-1', 'SPECIFIC_MEMBERS' as never)).rejects.toThrow(BadRequestException);
    });

    it('SPECIFIC_MEMBERS resolves only the given, linked members', async () => {
      vi.mocked(prisma.member.findMany).mockResolvedValue([{ userId: 'u1' }] as never);
      const result = await service.getAudienceCount('tenant-1', 'SPECIFIC_MEMBERS' as never, undefined, ['m1', 'm2']);
      expect(result.count).toBe(1);
      const call = vi.mocked(prisma.member.findMany).mock.calls[0]![0] as { where: { id: { in: string[] } } };
      expect(call.where.id.in).toEqual(['m1', 'm2']);
    });
  });

  describe('send', () => {
    it('creates the Announcement row with a recipientCount snapshot and fans out notifications', async () => {
      vi.mocked(prisma.member.findMany).mockResolvedValue([{ userId: 'u1' }, { userId: 'u2' }] as never);
      vi.mocked(prisma.announcement.create).mockResolvedValue(makeAnnouncement({ recipientCount: 2 }) as never);

      const result = await service.send('tenant-1', 'owner-1', {
        title: 'Front desk closing early',
        message: "We'll close early Friday.",
        audience: 'ALL_MEMBERS' as never,
      } as never);

      expect(result.recipientCount).toBe(2);
      expect(prisma.announcement.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ recipientCount: 2, sentByUserId: 'owner-1' }) }),
      );
      expect(notificationsService.notify).toHaveBeenCalledWith(
        'tenant-1',
        ['u1', 'u2'],
        expect.objectContaining({ category: 'ANNOUNCEMENT', relatedEntityType: 'announcement' }),
      );
    });

    it('does not call notify when the audience resolves to zero recipients', async () => {
      vi.mocked(prisma.member.findMany).mockResolvedValue([]);
      vi.mocked(prisma.announcement.create).mockResolvedValue(makeAnnouncement({ recipientCount: 0 }) as never);

      await service.send('tenant-1', 'owner-1', {
        title: 'Nobody home',
        message: 'x',
        audience: 'ALL_MEMBERS' as never,
      } as never);

      expect(notificationsService.notify).not.toHaveBeenCalled();
    });

    it('stores audiencePlanId only for the PLAN_MEMBERS audience', async () => {
      vi.mocked(prisma.memberMembership.findMany).mockResolvedValue([{ member: { userId: 'u1' } }] as never);
      vi.mocked(prisma.announcement.create).mockResolvedValue(makeAnnouncement({ audience: 'PLAN_MEMBERS', audiencePlanId: 'plan-1' }) as never);

      await service.send('tenant-1', 'owner-1', {
        title: 'Growth plan update',
        message: 'x',
        audience: 'PLAN_MEMBERS' as never,
        planId: 'plan-1',
      } as never);

      const call = vi.mocked(prisma.announcement.create).mock.calls[0]![0] as { data: { audiencePlanId: string | null } };
      expect(call.data.audiencePlanId).toBe('plan-1');
    });
  });

  describe('findByIdInTenant', () => {
    it('throws NotFoundException outside the tenant', async () => {
      vi.mocked(prisma.announcement.findFirst).mockResolvedValue(null);
      await expect(service.findByIdInTenant('tenant-1', 'missing')).rejects.toThrow(NotFoundException);
    });

    it('returns the announcement when found', async () => {
      vi.mocked(prisma.announcement.findFirst).mockResolvedValue(makeAnnouncement() as never);
      const result = await service.findByIdInTenant('tenant-1', 'ann-1');
      expect(result.id).toBe('ann-1');
    });
  });
});
