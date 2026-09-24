import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from './notifications.service.js';
import { NOTIFICATION_EVENTS } from './events/domain-events.js';
import type {
  BookingCancelledByStaffEvent,
  BookingConfirmedEvent,
  BookingPromotedEvent,
  BookingWaitlistedEvent,
  ClassOccurrenceCancelledEvent,
  ClassOccurrenceRescheduledEvent,
  MembershipLifecycleEvent,
  PtSessionCancelledEvent,
  PtSessionEvent,
  TransactionFailedEvent,
  TransactionPaidEvent,
  TransactionRefundedEvent,
} from './events/domain-events.js';
import { NotificationCategory, NotificationPriority } from '../generated/prisma/enums.js';
import { PAYMENT_ALERT_STAFF_ROLES } from './notification-rules.const.js';

function formatClassDateTime(date: Date, startTime: string): string {
  const formatted = new Intl.DateTimeFormat('en-GB', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date);
  return `${formatted}, ${startTime}`;
}

/**
 * The one place every domain event (see events/domain-events.ts) becomes
 * actual Notification rows — the "who should hear about this, and what
 * should it say" decision for each event lives here, in one place, rather
 * than scattered across every business service that emits one.
 *
 * Deliberately restrained: not every state change earns a notification —
 * a member cancelling their OWN booking doesn't notify them about their
 * own action; a class update that only touches capacity/location fires
 * nothing. See each handler's own comment for the specific reasoning.
 *
 * Every handler body runs through `guard()`. EventEmitter2's plain
 * `emit()` (used by every business-service call site — see
 * domain-events.ts) never awaits an async listener, so an uncaught
 * rejection here would become an unhandled promise rejection at the
 * process level — on modern Node that terminates the process outright.
 * A failed notification must never be able to do that, so every handler
 * catches and logs instead of letting an error escape.
 */
@Injectable()
export class NotificationsEventListener {
  private readonly logger = new Logger(NotificationsEventListener.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  private async guard(eventName: string, fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
    } catch (error) {
      this.logger.error(`Failed to create notification(s) for event "${eventName}"`, error instanceof Error ? error.stack : error);
    }
  }

  @OnEvent(NOTIFICATION_EVENTS.BOOKING_CONFIRMED)
  onBookingConfirmed(event: BookingConfirmedEvent): Promise<void> {
    return this.guard(NOTIFICATION_EVENTS.BOOKING_CONFIRMED, async () => {
      await this.notificationsService.notifyMember(event.tenantId, event.memberId, {
        category: NotificationCategory.BOOKING,
        priority: NotificationPriority.LOW,
        title: 'Class booking confirmed',
        message: `You're booked for ${event.className}, ${formatClassDateTime(event.date, event.startTime)}.`,
        relatedEntityType: 'class_booking',
        relatedEntityId: event.bookingId,
        actionUrl: '/portal/bookings',
      });
    });
  }

  @OnEvent(NOTIFICATION_EVENTS.BOOKING_WAITLISTED)
  onBookingWaitlisted(event: BookingWaitlistedEvent): Promise<void> {
    return this.guard(NOTIFICATION_EVENTS.BOOKING_WAITLISTED, async () => {
      await this.notificationsService.notifyMember(event.tenantId, event.memberId, {
        category: NotificationCategory.WAITLIST,
        priority: NotificationPriority.MEDIUM,
        title: "You're on the waitlist",
        message: `${event.className} (${formatClassDateTime(event.date, event.startTime)}) is full — we'll notify you if a spot opens.`,
        relatedEntityType: 'class_booking',
        relatedEntityId: event.bookingId,
        actionUrl: '/portal/bookings',
      });
    });
  }

  @OnEvent(NOTIFICATION_EVENTS.BOOKING_PROMOTED)
  onBookingPromoted(event: BookingPromotedEvent): Promise<void> {
    return this.guard(NOTIFICATION_EVENTS.BOOKING_PROMOTED, async () => {
      await this.notificationsService.notifyMember(event.tenantId, event.memberId, {
        category: NotificationCategory.BOOKING,
        priority: NotificationPriority.MEDIUM,
        title: "You're off the waitlist!",
        message: `A spot opened up in ${event.className} (${formatClassDateTime(event.date, event.startTime)}) — you're now booked in.`,
        relatedEntityType: 'class_booking',
        relatedEntityId: event.bookingId,
        actionUrl: '/portal/bookings',
      });
    });
  }

  /** Only ever emitted for a staff-driven cancellation — a member cancelling their own booking doesn't need to be told about their own action. */
  @OnEvent(NOTIFICATION_EVENTS.BOOKING_CANCELLED_BY_STAFF)
  onBookingCancelledByStaff(event: BookingCancelledByStaffEvent): Promise<void> {
    return this.guard(NOTIFICATION_EVENTS.BOOKING_CANCELLED_BY_STAFF, async () => {
      await this.notificationsService.notifyMember(event.tenantId, event.memberId, {
        category: NotificationCategory.BOOKING,
        priority: NotificationPriority.MEDIUM,
        title: 'Booking cancelled',
        message: `Your booking for ${event.className} (${formatClassDateTime(event.date, event.startTime)}) was cancelled by the studio.`,
        relatedEntityType: 'class_booking',
        relatedEntityId: event.bookingId,
        actionUrl: '/portal/bookings',
      });
    });
  }

  @OnEvent(NOTIFICATION_EVENTS.CLASS_OCCURRENCE_CANCELLED)
  onClassOccurrenceCancelled(event: ClassOccurrenceCancelledEvent): Promise<void> {
    return this.guard(NOTIFICATION_EVENTS.CLASS_OCCURRENCE_CANCELLED, async () => {
      const when = formatClassDateTime(event.date, event.startTime);
      const reasonSuffix = event.reason ? ` — ${event.reason}` : '';
      await Promise.all([
        this.notificationsService.notifyMembers(event.tenantId, event.affectedMemberIds, {
          category: NotificationCategory.CLASS,
          priority: NotificationPriority.HIGH,
          title: 'Class cancelled',
          message: `${event.className} (${when}), which you had booked, was cancelled${reasonSuffix}.`,
          relatedEntityType: 'class_occurrence',
          relatedEntityId: event.classOccurrenceId,
          actionUrl: '/portal/classes',
        }),
        this.notificationsService.notifyUser(event.tenantId, event.trainerId, {
          category: NotificationCategory.CLASS,
          priority: NotificationPriority.MEDIUM,
          title: 'Your class was cancelled',
          message: `${event.className} (${when}) was cancelled${reasonSuffix}.`,
          relatedEntityType: 'class_occurrence',
          relatedEntityId: event.classOccurrenceId,
          actionUrl: '/trainer/schedule',
        }),
      ]);
    });
  }

  /** Only emitted when the date/time/trainer of a session actually changed — see ClassesService.updateOccurrence's own trigger logic; a capacity/location-only edit fires nothing. */
  @OnEvent(NOTIFICATION_EVENTS.CLASS_OCCURRENCE_RESCHEDULED)
  onClassOccurrenceRescheduled(event: ClassOccurrenceRescheduledEvent): Promise<void> {
    return this.guard(NOTIFICATION_EVENTS.CLASS_OCCURRENCE_RESCHEDULED, async () => {
      const when = formatClassDateTime(event.date, event.startTime);
      await Promise.all([
        this.notificationsService.notifyMembers(event.tenantId, event.affectedMemberIds, {
          category: NotificationCategory.CLASS,
          priority: NotificationPriority.MEDIUM,
          title: 'Class rescheduled',
          message: `${event.className}, which you had booked, is now ${when}.`,
          relatedEntityType: 'class_occurrence',
          relatedEntityId: event.classOccurrenceId,
          actionUrl: '/portal/classes',
        }),
        ...event.trainerIds.map((trainerId) =>
          this.notificationsService.notifyUser(event.tenantId, trainerId, {
            category: NotificationCategory.CLASS,
            priority: NotificationPriority.LOW,
            title: 'Class schedule change',
            message: `${event.className} is now ${when}.`,
            relatedEntityType: 'class_occurrence',
            relatedEntityId: event.classOccurrenceId,
            actionUrl: '/trainer/schedule',
          }),
        ),
      ]);
    });
  }

  /** Notifies the trainer only — the member already knows, they just booked it themselves. */
  @OnEvent(NOTIFICATION_EVENTS.PT_SESSION_BOOKED)
  onPtSessionBooked(event: PtSessionEvent): Promise<void> {
    return this.guard(NOTIFICATION_EVENTS.PT_SESSION_BOOKED, async () => {
      await this.notificationsService.notifyUser(event.tenantId, event.trainerId, {
        category: NotificationCategory.BOOKING,
        priority: NotificationPriority.MEDIUM,
        title: 'New PT booking',
        message: `A member booked a session with you for ${formatClassDateTime(event.date, event.startTime)}.`,
        relatedEntityType: 'pt_session',
        relatedEntityId: event.sessionId,
        actionUrl: '/trainer/schedule',
      });
    });
  }

  @OnEvent(NOTIFICATION_EVENTS.PT_SESSION_RESCHEDULED)
  onPtSessionRescheduled(event: PtSessionEvent): Promise<void> {
    return this.guard(NOTIFICATION_EVENTS.PT_SESSION_RESCHEDULED, async () => {
      await this.notificationsService.notifyUser(event.tenantId, event.trainerId, {
        category: NotificationCategory.BOOKING,
        priority: NotificationPriority.LOW,
        title: 'PT session rescheduled',
        message: `A session was moved to ${formatClassDateTime(event.date, event.startTime)}.`,
        relatedEntityType: 'pt_session',
        relatedEntityId: event.sessionId,
        actionUrl: '/trainer/schedule',
      });
    });
  }

  /** Notifies whichever party did NOT cancel — the actor already knows. */
  @OnEvent(NOTIFICATION_EVENTS.PT_SESSION_CANCELLED)
  onPtSessionCancelled(event: PtSessionCancelledEvent): Promise<void> {
    return this.guard(NOTIFICATION_EVENTS.PT_SESSION_CANCELLED, async () => {
      const when = formatClassDateTime(event.date, event.startTime);
      if (event.cancelledBy === 'member') {
        await this.notificationsService.notifyUser(event.tenantId, event.trainerId, {
          category: NotificationCategory.BOOKING,
          priority: NotificationPriority.MEDIUM,
          title: 'Session cancelled',
          message: `A member cancelled their ${when} session with you.`,
          relatedEntityType: 'pt_session',
          relatedEntityId: event.sessionId,
          actionUrl: '/trainer/schedule',
        });
      } else {
        await this.notificationsService.notifyMember(event.tenantId, event.memberId, {
          category: NotificationCategory.BOOKING,
          priority: NotificationPriority.MEDIUM,
          title: 'Session cancelled',
          message: `Your ${when} personal training session was cancelled.`,
          relatedEntityType: 'pt_session',
          relatedEntityId: event.sessionId,
          actionUrl: '/portal/bookings',
        });
      }
    });
  }

  @OnEvent(NOTIFICATION_EVENTS.MEMBERSHIP_CREATED)
  onMembershipCreated(event: MembershipLifecycleEvent): Promise<void> {
    return this.guard(NOTIFICATION_EVENTS.MEMBERSHIP_CREATED, async () => {
      await this.notificationsService.notifyMember(event.tenantId, event.memberId, {
        category: NotificationCategory.RENEWAL,
        priority: NotificationPriority.LOW,
        title: 'Membership started',
        message: `Your ${event.planName} plan is now active.`,
        relatedEntityType: 'membership',
        relatedEntityId: event.membershipId,
        actionUrl: '/portal/membership',
      });
    });
  }

  @OnEvent(NOTIFICATION_EVENTS.MEMBERSHIP_RENEWED)
  onMembershipRenewed(event: MembershipLifecycleEvent): Promise<void> {
    return this.guard(NOTIFICATION_EVENTS.MEMBERSHIP_RENEWED, async () => {
      await this.notificationsService.notifyMember(event.tenantId, event.memberId, {
        category: NotificationCategory.RENEWAL,
        priority: NotificationPriority.LOW,
        title: 'Membership renewed',
        message: `Your ${event.planName} plan has been renewed.`,
        relatedEntityType: 'membership',
        relatedEntityId: event.membershipId,
        actionUrl: '/portal/membership',
      });
    });
  }

  @OnEvent(NOTIFICATION_EVENTS.MEMBERSHIP_CANCELLED)
  onMembershipCancelled(event: MembershipLifecycleEvent): Promise<void> {
    return this.guard(NOTIFICATION_EVENTS.MEMBERSHIP_CANCELLED, async () => {
      await this.notificationsService.notifyMember(event.tenantId, event.memberId, {
        category: NotificationCategory.RENEWAL,
        priority: NotificationPriority.MEDIUM,
        title: 'Membership cancelled',
        message: `Your ${event.planName} plan has been cancelled.`,
        relatedEntityType: 'membership',
        relatedEntityId: event.membershipId,
        actionUrl: '/portal/membership',
      });
    });
  }

  @OnEvent(NOTIFICATION_EVENTS.TRANSACTION_PAID)
  onTransactionPaid(event: TransactionPaidEvent): Promise<void> {
    return this.guard(NOTIFICATION_EVENTS.TRANSACTION_PAID, async () => {
      await this.notificationsService.notifyMember(event.tenantId, event.memberId, {
        category: NotificationCategory.PAYMENT,
        priority: NotificationPriority.LOW,
        title: 'Payment received',
        message: `Payment of ${event.currency} ${event.amount.toFixed(2)} for ${event.description} was received.`,
        relatedEntityType: 'transaction',
        relatedEntityId: event.transactionId,
        actionUrl: '/portal/membership',
      });
    });
  }

  /** Notifies both the member (their own payment) and authorized staff (a business-critical alert) — matches the task's own "payment failure → appropriate authorized user" example. */
  @OnEvent(NOTIFICATION_EVENTS.TRANSACTION_FAILED)
  onTransactionFailed(event: TransactionFailedEvent): Promise<void> {
    return this.guard(NOTIFICATION_EVENTS.TRANSACTION_FAILED, async () => {
      const reasonSuffix = event.reason ? ` (${event.reason})` : '';
      await Promise.all([
        this.notificationsService.notifyMember(event.tenantId, event.memberId, {
          category: NotificationCategory.PAYMENT,
          priority: NotificationPriority.HIGH,
          title: 'Payment failed',
          message: `Your payment of ${event.currency} ${event.amount.toFixed(2)} for ${event.description} didn't go through${reasonSuffix}.`,
          relatedEntityType: 'transaction',
          relatedEntityId: event.transactionId,
          actionUrl: '/portal/membership',
        }),
        this.notificationsService.notifyUsersByRoles(event.tenantId, [...PAYMENT_ALERT_STAFF_ROLES], {
          category: NotificationCategory.PAYMENT,
          priority: NotificationPriority.HIGH,
          title: 'Payment failed',
          message: `A payment of ${event.currency} ${event.amount.toFixed(2)} for ${event.description} failed${reasonSuffix}.`,
          relatedEntityType: 'transaction',
          relatedEntityId: event.transactionId,
          actionUrl: '/owner/payments?tab=pending',
        }),
      ]);
    });
  }

  @OnEvent(NOTIFICATION_EVENTS.TRANSACTION_REFUNDED)
  onTransactionRefunded(event: TransactionRefundedEvent): Promise<void> {
    return this.guard(NOTIFICATION_EVENTS.TRANSACTION_REFUNDED, async () => {
      await this.notificationsService.notifyMember(event.tenantId, event.memberId, {
        category: NotificationCategory.PAYMENT,
        priority: NotificationPriority.LOW,
        title: event.isFullRefund ? 'Refund issued' : 'Partial refund issued',
        message: `${event.currency} ${event.amount.toFixed(2)} was refunded to you.`,
        relatedEntityType: 'refund',
        relatedEntityId: event.refundId,
        actionUrl: '/portal/membership',
      });
    });
  }
}
