/**
 * The event/listener contract between every business module and the
 * notifications module. A business service imports only this file (string
 * constants + plain payload types — no service, no module) and calls
 * `EventEmitter2.emit(NOTIFICATION_EVENTS.X, payload)` after its own
 * transaction has committed; NotificationsEventListener is the only thing
 * that ever imports business services to resolve "who should hear about
 * this and what should it say."
 *
 * This is what keeps a business module and the notifications module
 * decoupled: Memberships/Payments/Bookings/PT never import
 * NotificationsService, so there's no import-cycle risk and no module
 * wiring needed on their side beyond having EventEmitterModule registered
 * once, globally, in AppModule.
 *
 * IMPORTANT — emit only after commit: every one of these events is emitted
 * once the originating write has durably committed, never from inside a
 * `runSerializableTransaction`/`$transaction` callback. A Serializable
 * transaction can be retried by Postgres on a write conflict (see
 * common/utils/serializable-transaction.util.ts) — emitting from inside the
 * callback would fire the event once per attempt, including attempts that
 * were thrown away, producing a phantom/duplicate notification for state
 * that was never actually committed.
 */
export const NOTIFICATION_EVENTS = {
  BOOKING_CONFIRMED: 'booking.confirmed',
  BOOKING_WAITLISTED: 'booking.waitlisted',
  BOOKING_PROMOTED: 'booking.promoted',
  BOOKING_CANCELLED_BY_STAFF: 'booking.cancelled-by-staff',
  CLASS_OCCURRENCE_CANCELLED: 'class-occurrence.cancelled',
  CLASS_OCCURRENCE_RESCHEDULED: 'class-occurrence.rescheduled',
  PT_SESSION_BOOKED: 'pt-session.booked',
  PT_SESSION_RESCHEDULED: 'pt-session.rescheduled',
  PT_SESSION_CANCELLED: 'pt-session.cancelled',
  MEMBERSHIP_CREATED: 'membership.created',
  MEMBERSHIP_RENEWED: 'membership.renewed',
  MEMBERSHIP_CANCELLED: 'membership.cancelled',
  TRANSACTION_PAID: 'transaction.paid',
  TRANSACTION_FAILED: 'transaction.failed',
  TRANSACTION_REFUNDED: 'transaction.refunded',
  CHECK_IN_DENIED: 'check-in.denied',
  CLASS_BOOKING_NO_SHOW: 'class-booking.no-show',
  PT_SESSION_NO_SHOW: 'pt-session.no-show',
} as const;

export interface BookingConfirmedEvent {
  tenantId: string;
  memberId: string;
  bookingId: string;
  classOccurrenceId: string;
  className: string;
  date: Date;
  startTime: string;
}

export type BookingWaitlistedEvent = BookingConfirmedEvent;
export type BookingPromotedEvent = BookingConfirmedEvent;
export type BookingCancelledByStaffEvent = BookingConfirmedEvent;

export interface ClassOccurrenceCancelledEvent {
  tenantId: string;
  classOccurrenceId: string;
  className: string;
  date: Date;
  startTime: string;
  trainerId: string;
  affectedMemberIds: string[];
  reason?: string;
}

export interface ClassOccurrenceRescheduledEvent {
  tenantId: string;
  classOccurrenceId: string;
  className: string;
  date: Date;
  startTime: string;
  trainerIds: string[];
  affectedMemberIds: string[];
}

export interface PtSessionEvent {
  tenantId: string;
  sessionId: string;
  memberId: string;
  trainerId: string;
  date: Date;
  startTime: string;
}

export interface PtSessionCancelledEvent extends PtSessionEvent {
  /** Who cancelled it — the other party is the one who gets notified. */
  cancelledBy: 'member' | 'staff';
}

export interface MembershipLifecycleEvent {
  tenantId: string;
  memberId: string;
  membershipId: string;
  planName: string;
}

export interface TransactionPaidEvent {
  tenantId: string;
  memberId: string;
  transactionId: string;
  amount: number;
  currency: string;
  description: string;
}

export interface TransactionFailedEvent {
  tenantId: string;
  memberId: string;
  transactionId: string;
  amount: number;
  currency: string;
  description: string;
  reason?: string;
}

export interface TransactionRefundedEvent {
  tenantId: string;
  memberId: string;
  transactionId: string;
  refundId: string;
  amount: number;
  currency: string;
  isFullRefund: boolean;
}

/**
 * A member's own check-in attempt was turned away for a business reason
 * (expired/frozen/cancelled membership, no membership at all, or an
 * inactive member record) — never for a technical failure like an invalid
 * QR token, which has no member context to notify about. Notifies staff
 * only, not the member: they're standing at the door and already saw the
 * denial on-screen (kiosk/front-desk) or on their own phone (self QR) —
 * the same "the actor already knows" reasoning BOOKING_CANCELLED_BY_STAFF's
 * own comment gives for who does and doesn't get told. Staff being told
 * turns a lost visit into a follow-up opportunity (renew at the desk),
 * mirroring TRANSACTION_FAILED's own staff-alert reasoning.
 */
export interface CheckInDeniedEvent {
  tenantId: string;
  memberId: string;
  memberName: string;
  reason: 'MEMBERSHIP_EXPIRED' | 'MEMBERSHIP_FROZEN' | 'MEMBERSHIP_CANCELLED' | 'NO_MEMBERSHIP' | 'MEMBER_INACTIVE';
}

/** A trainer marked a member's class/PT booking as a no-show — the member wasn't there to see it happen, unlike an ATTENDED mark, which needs no notification. */
export interface AttendanceNoShowEvent {
  tenantId: string;
  memberId: string;
  bookingId: string;
  className: string;
  date: Date;
  startTime: string;
}
