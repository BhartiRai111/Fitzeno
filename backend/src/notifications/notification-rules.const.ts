import { NotificationCategory, UserRole } from '../generated/prisma/enums.js';

/**
 * Which notification categories each role is even offered a toggle for —
 * mirrors the approved frontend's own member/staff preference-channel split
 * (MemberNotificationChannelsDto / StaffNotificationChannelsDto in the
 * Gym/Tenant phase), extended per-role rather than one fixed "staff" shape,
 * since a TRAINER's relevant categories are a real subset of an OWNER's.
 * A category not in a role's list here is simply never shown to them as a
 * toggle — not because it's forced on, but because it never applies to
 * that role in the first place (a TRAINER is never the recipient of a
 * PAYMENT or LEAD notification to begin with).
 */
export const ROLE_NOTIFICATION_CATEGORIES: Record<UserRole, NotificationCategory[]> = {
  [UserRole.MEMBER]: [
    NotificationCategory.BOOKING,
    NotificationCategory.RENEWAL,
    NotificationCategory.PAYMENT,
    NotificationCategory.ATTENDANCE,
    NotificationCategory.ANNOUNCEMENT,
    NotificationCategory.PROMOTION,
  ],
  [UserRole.TRAINER]: [
    NotificationCategory.BOOKING,
    NotificationCategory.CLASS,
    NotificationCategory.ATTENDANCE,
    NotificationCategory.ANNOUNCEMENT,
  ],
  [UserRole.FRONT_DESK]: [
    NotificationCategory.BOOKING,
    NotificationCategory.CLASS,
    NotificationCategory.ATTENDANCE,
    NotificationCategory.ANNOUNCEMENT,
    NotificationCategory.LEAD,
    NotificationCategory.PAYMENT,
    NotificationCategory.RENEWAL,
  ],
  [UserRole.MANAGER]: [
    NotificationCategory.BOOKING,
    NotificationCategory.CLASS,
    NotificationCategory.ATTENDANCE,
    NotificationCategory.ANNOUNCEMENT,
    NotificationCategory.LEAD,
    NotificationCategory.PAYMENT,
    NotificationCategory.RENEWAL,
    NotificationCategory.STAFF,
  ],
  [UserRole.OWNER]: [
    NotificationCategory.BOOKING,
    NotificationCategory.CLASS,
    NotificationCategory.ATTENDANCE,
    NotificationCategory.ANNOUNCEMENT,
    NotificationCategory.LEAD,
    NotificationCategory.PAYMENT,
    NotificationCategory.RENEWAL,
    NotificationCategory.STAFF,
  ],
};

/**
 * Categories no user may opt out of — see NotificationsService.updatePreferences.
 * SYSTEM is reserved for structural/operational notices important enough
 * that suppressing them would be a product bug, not a preference (nothing
 * emits it yet, but the guard exists so a future trigger doesn't also need
 * a preference-bypass mechanism built for it).
 */
export const NON_TOGGLEABLE_CATEGORIES: readonly NotificationCategory[] = [NotificationCategory.SYSTEM];

/** Staff roles targeted by a business-critical broadcast (payment failures, unassigned lead follow-ups) — see NotificationsEventListener. */
export const PAYMENT_ALERT_STAFF_ROLES: readonly UserRole[] = [UserRole.OWNER, UserRole.MANAGER, UserRole.FRONT_DESK];
export const LEAD_ALERT_STAFF_ROLES: readonly UserRole[] = [UserRole.OWNER, UserRole.MANAGER, UserRole.FRONT_DESK];

// ---------------------------------------------------------------------------
// Dedup-key builders for scheduled/reminder notifications — see the
// Notification model's own comment for why these exist (a unique DB
// constraint standing in for a separate "already sent" log). Each key
// encodes exactly the (entity, milestone) pair that must fire at most once.
// ---------------------------------------------------------------------------
export function membershipExpiringDedupKey(membershipId: string, daysRemaining: number): string {
  return `membership:${membershipId}:expiring:${daysRemaining}d`;
}

export function membershipExpiredDedupKey(membershipId: string): string {
  return `membership:${membershipId}:expired`;
}

/**
 * No memberId in the key itself — the Notification table's unique
 * constraint is `(recipientUserId, dedupKey)`, so different recipients can
 * safely share the same dedupKey text for the same occurrence; only a
 * second reminder for the SAME recipient about the SAME occurrence would
 * collide, which is exactly the duplicate this is meant to prevent.
 */
export function classReminderDedupKey(classOccurrenceId: string): string {
  return `class-reminder:${classOccurrenceId}`;
}

export function ptReminderDedupKey(sessionId: string): string {
  return `pt-reminder:${sessionId}`;
}

/** Dated so a lead whose follow-up is pushed out and becomes due again later gets a fresh reminder rather than being permanently deduped by its first due date. */
export function leadFollowUpDedupKey(leadId: string, dueDateIso: string): string {
  return `lead-followup:${leadId}:${dueDateIso}`;
}
