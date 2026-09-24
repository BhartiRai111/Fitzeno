import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationsSchedulerService } from './notifications-scheduler.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { NotificationsService } from './notifications.service.js';

describe('NotificationsSchedulerService', () => {
  let prisma: PrismaService;
  let notificationsService: NotificationsService;
  let service: NotificationsSchedulerService;

  beforeEach(() => {
    prisma = {
      memberMembership: { findMany: vi.fn().mockResolvedValue([]) },
      lead: { findMany: vi.fn().mockResolvedValue([]) },
      classOccurrence: { findMany: vi.fn().mockResolvedValue([]) },
      personalTrainingSession: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;

    notificationsService = {
      notifyMember: vi.fn().mockResolvedValue(undefined),
      notifyMembers: vi.fn().mockResolvedValue(undefined),
      notifyUser: vi.fn().mockResolvedValue(undefined),
      notifyUsersByRoles: vi.fn().mockResolvedValue(undefined),
    } as unknown as NotificationsService;

    service = new NotificationsSchedulerService(prisma, notificationsService);
  });

  describe('sendMembershipExpiryReminders', () => {
    it('queries both the 7-day and 1-day milestones and notifies each member found', async () => {
      vi.mocked(prisma.memberMembership.findMany)
        .mockResolvedValueOnce([{ id: 'ms-1', tenantId: 'tenant-1', memberId: 'member-1', planName: 'Growth' }] as never)
        .mockResolvedValueOnce([{ id: 'ms-2', tenantId: 'tenant-1', memberId: 'member-2', planName: 'Elite' }] as never);

      await service.sendMembershipExpiryReminders();

      expect(prisma.memberMembership.findMany).toHaveBeenCalledTimes(2);
      expect(notificationsService.notifyMember).toHaveBeenCalledTimes(2);
      expect(notificationsService.notifyMember).toHaveBeenCalledWith(
        'tenant-1',
        'member-1',
        expect.objectContaining({ dedupKey: 'membership:ms-1:expiring:7d', priority: 'MEDIUM' }),
      );
      expect(notificationsService.notifyMember).toHaveBeenCalledWith(
        'tenant-1',
        'member-2',
        expect.objectContaining({ dedupKey: 'membership:ms-2:expiring:1d', priority: 'HIGH' }),
      );
    });

    it('does nothing when no membership matches either milestone', async () => {
      vi.mocked(prisma.memberMembership.findMany).mockResolvedValue([]);
      await service.sendMembershipExpiryReminders();
      expect(notificationsService.notifyMember).not.toHaveBeenCalled();
    });
  });

  describe('sendMembershipExpiredNotices', () => {
    it('notifies each member whose membership expired yesterday, with a stable dedup key', async () => {
      vi.mocked(prisma.memberMembership.findMany).mockResolvedValue([
        { id: 'ms-3', tenantId: 'tenant-1', memberId: 'member-3', planName: 'Basic' },
      ] as never);

      await service.sendMembershipExpiredNotices();

      expect(notificationsService.notifyMember).toHaveBeenCalledWith(
        'tenant-1',
        'member-3',
        expect.objectContaining({ dedupKey: 'membership:ms-3:expired', title: 'Membership expired' }),
      );
    });
  });

  describe('sendLeadFollowUpReminders', () => {
    it('notifies the assigned staff member directly when one is set', async () => {
      vi.mocked(prisma.lead.findMany).mockResolvedValue([
        { id: 'lead-1', tenantId: 'tenant-1', assignedToId: 'staff-1', firstName: 'Ben', lastName: 'Foster' },
      ] as never);

      await service.sendLeadFollowUpReminders();

      expect(notificationsService.notifyUser).toHaveBeenCalledWith(
        'tenant-1',
        'staff-1',
        expect.objectContaining({ category: 'LEAD', relatedEntityId: 'lead-1' }),
      );
      expect(notificationsService.notifyUsersByRoles).not.toHaveBeenCalled();
    });

    it('broadcasts to lead-managing staff roles when no one is assigned', async () => {
      vi.mocked(prisma.lead.findMany).mockResolvedValue([
        { id: 'lead-2', tenantId: 'tenant-1', assignedToId: null, firstName: 'Naomi', lastName: 'Clarke' },
      ] as never);

      await service.sendLeadFollowUpReminders();

      expect(notificationsService.notifyUsersByRoles).toHaveBeenCalledWith(
        'tenant-1',
        expect.arrayContaining(['OWNER', 'MANAGER', 'FRONT_DESK']),
        expect.objectContaining({ relatedEntityId: 'lead-2' }),
      );
      expect(notificationsService.notifyUser).not.toHaveBeenCalled();
    });

    it('excludes converted and lost leads from the due-today query', async () => {
      await service.sendLeadFollowUpReminders();
      const call = vi.mocked(prisma.lead.findMany).mock.calls[0]![0] as { where: { status: { notIn: string[] } } };
      expect(call.where.status.notIn.sort()).toEqual(['CONVERTED', 'LOST'].sort());
    });
  });

  describe('sendUpcomingClassReminders', () => {
    it('notifies every confirmed-booked member for tomorrow\'s occurrences', async () => {
      vi.mocked(prisma.classOccurrence.findMany).mockResolvedValue([
        {
          id: 'occ-1',
          tenantId: 'tenant-1',
          startTime: '09:00',
          classSeries: { name: 'Strength Fundamentals' },
          bookings: [{ memberId: 'member-1' }, { memberId: 'member-2' }],
        },
      ] as never);

      await service.sendUpcomingClassReminders();

      expect(notificationsService.notifyMembers).toHaveBeenCalledWith(
        'tenant-1',
        ['member-1', 'member-2'],
        expect.objectContaining({ dedupKey: 'class-reminder:occ-1', category: 'CLASS' }),
      );
    });
  });

  describe('sendUpcomingPtSessionReminders', () => {
    it('notifies the member of tomorrow\'s confirmed PT session', async () => {
      vi.mocked(prisma.personalTrainingSession.findMany).mockResolvedValue([
        { id: 'pt-1', tenantId: 'tenant-1', memberId: 'member-1', startTime: '08:00' },
      ] as never);

      await service.sendUpcomingPtSessionReminders();

      expect(notificationsService.notifyMember).toHaveBeenCalledWith(
        'tenant-1',
        'member-1',
        expect.objectContaining({ dedupKey: 'pt-reminder:pt-1', category: 'BOOKING' }),
      );
    });
  });
});
