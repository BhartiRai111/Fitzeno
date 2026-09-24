import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from './notifications.service.js';
import { NotificationCategory, NotificationPriority } from '../generated/prisma/enums.js';
import {
  classReminderDedupKey,
  LEAD_ALERT_STAFF_ROLES,
  leadFollowUpDedupKey,
  membershipExpiredDedupKey,
  membershipExpiringDedupKey,
  ptReminderDedupKey,
} from './notification-rules.const.js';

/** Milestones a membership-expiry reminder fires at — NOT every day of the 14-day "expiring soon" window (see MembershipsService's own threshold), specifically to avoid notification spam: one heads-up a week out, one final nudge the day before. */
const EXPIRY_REMINDER_MILESTONE_DAYS = [7, 1];

function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/**
 * Every scheduled/reminder notification this backend produces — no
 * external queue or worker process, `@nestjs/schedule`'s in-process cron
 * is the right amount of infrastructure at this scale (a single backend
 * instance, no need for distributed job coordination yet). Every job here
 * runs across ALL tenants in one pass (a cron trigger has no per-request
 * tenant context the way a controller does), and every notification it
 * creates still carries a real dedupKey (see the Notification model's own
 * comment) so a job re-running — a server restart mid-run, an overlapping
 * trigger — can never double-send the same reminder.
 *
 * Each method is public and independently callable (not just @Cron-fired)
 * specifically so tests can trigger one directly rather than waiting on a
 * real clock tick or mocking @nestjs/schedule's internals.
 */
@Injectable()
export class NotificationsSchedulerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendMembershipExpiryReminders(): Promise<void> {
    const today = todayUtc();
    for (const daysRemaining of EXPIRY_REMINDER_MILESTONE_DAYS) {
      const targetEndDate = addDays(today, daysRemaining);
      const memberships = await this.prisma.memberMembership.findMany({
        where: { status: 'ACTIVE', endDate: targetEndDate, member: { userId: { not: null } } },
        select: { id: true, tenantId: true, memberId: true, planName: true },
      });
      for (const membership of memberships) {
        await this.notificationsService.notifyMember(membership.tenantId, membership.memberId, {
          category: NotificationCategory.RENEWAL,
          priority: daysRemaining <= 1 ? NotificationPriority.HIGH : NotificationPriority.MEDIUM,
          title: daysRemaining === 1 ? 'Membership expires tomorrow' : `Membership expires in ${daysRemaining} days`,
          message: `Your ${membership.planName} plan ${daysRemaining === 1 ? 'expires tomorrow' : `expires in ${daysRemaining} days`} — renew to keep your access.`,
          relatedEntityType: 'membership',
          relatedEntityId: membership.id,
          actionUrl: '/portal/membership',
          dedupKey: membershipExpiringDedupKey(membership.id, daysRemaining),
        });
      }
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendMembershipExpiredNotices(): Promise<void> {
    const yesterday = addDays(todayUtc(), -1);
    const memberships = await this.prisma.memberMembership.findMany({
      where: { status: 'ACTIVE', endDate: yesterday, member: { userId: { not: null } } },
      select: { id: true, tenantId: true, memberId: true, planName: true },
    });
    for (const membership of memberships) {
      await this.notificationsService.notifyMember(membership.tenantId, membership.memberId, {
        category: NotificationCategory.RENEWAL,
        priority: NotificationPriority.MEDIUM,
        title: 'Membership expired',
        message: `Your ${membership.planName} plan has expired.`,
        relatedEntityType: 'membership',
        relatedEntityId: membership.id,
        actionUrl: '/portal/membership',
        dedupKey: membershipExpiredDedupKey(membership.id),
      });
    }
  }

  /**
   * Leads whose `nextFollowUpAt` falls today — reminds the assigned staff
   * member, or broadcasts to every staff user who can manage leads
   * (see LEAD_ALERT_STAFF_ROLES) when nobody's assigned yet. Only fires
   * the day a follow-up becomes due, not every day it stays overdue —
   * a lead already weeks overdue doesn't re-notify daily (see the
   * README's known limitations for what that trade-off means).
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendLeadFollowUpReminders(): Promise<void> {
    const today = todayUtc();
    const tomorrow = addDays(today, 1);
    const leads = await this.prisma.lead.findMany({
      where: { status: { notIn: ['CONVERTED', 'LOST'] }, nextFollowUpAt: { gte: today, lt: tomorrow } },
      select: { id: true, tenantId: true, assignedToId: true, firstName: true, lastName: true },
    });
    for (const lead of leads) {
      const dedupKey = leadFollowUpDedupKey(lead.id, today.toISOString().slice(0, 10));
      const params = {
        category: NotificationCategory.LEAD,
        priority: NotificationPriority.MEDIUM,
        title: 'Lead follow-up due',
        message: `${lead.firstName} ${lead.lastName}'s follow-up is due today.`,
        relatedEntityType: 'lead',
        relatedEntityId: lead.id,
        actionUrl: '/owner/leads?tab=followups',
        dedupKey,
      };
      if (lead.assignedToId) {
        await this.notificationsService.notifyUser(lead.tenantId, lead.assignedToId, params);
      } else {
        await this.notificationsService.notifyUsersByRoles(lead.tenantId, [...LEAD_ALERT_STAFF_ROLES], params);
      }
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendUpcomingClassReminders(): Promise<void> {
    const tomorrow = addDays(todayUtc(), 1);
    const occurrences = await this.prisma.classOccurrence.findMany({
      where: { status: 'SCHEDULED', date: tomorrow },
      select: {
        id: true,
        tenantId: true,
        startTime: true,
        classSeries: { select: { name: true } },
        bookings: { where: { status: 'CONFIRMED' }, select: { memberId: true } },
      },
    });
    for (const occurrence of occurrences) {
      const memberIds = occurrence.bookings.map((b) => b.memberId);
      await this.notificationsService.notifyMembers(occurrence.tenantId, memberIds, {
        category: NotificationCategory.CLASS,
        priority: NotificationPriority.LOW,
        title: 'Upcoming class tomorrow',
        message: `${occurrence.classSeries.name} is tomorrow at ${occurrence.startTime}.`,
        relatedEntityType: 'class_occurrence',
        relatedEntityId: occurrence.id,
        actionUrl: '/portal/classes',
        dedupKey: classReminderDedupKey(occurrence.id),
      });
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendUpcomingPtSessionReminders(): Promise<void> {
    const tomorrow = addDays(todayUtc(), 1);
    const sessions = await this.prisma.personalTrainingSession.findMany({
      where: { status: 'CONFIRMED', date: tomorrow },
      select: { id: true, tenantId: true, memberId: true, startTime: true },
    });
    for (const session of sessions) {
      await this.notificationsService.notifyMember(session.tenantId, session.memberId, {
        category: NotificationCategory.BOOKING,
        priority: NotificationPriority.LOW,
        title: 'Upcoming PT session tomorrow',
        message: `Your personal training session is tomorrow at ${session.startTime}.`,
        relatedEntityType: 'pt_session',
        relatedEntityId: session.id,
        actionUrl: '/portal/bookings',
        dedupKey: ptReminderDedupKey(session.id),
      });
    }
  }
}
