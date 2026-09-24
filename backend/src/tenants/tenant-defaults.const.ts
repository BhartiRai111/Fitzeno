/**
 * Seed values for a brand-new gym's TenantSettings row — created alongside
 * every Tenant (AuthService.registerBusiness, prisma/seed.ts) so an owner
 * has a working, sensible configuration from the start rather than a
 * screen full of empty fields to fill in before the account is usable.
 * Mirrors the approved frontend's Settings-page defaults (src/app/owner/
 * settings/page.tsx) exactly, so nothing visibly changes when that page is
 * later wired up to these APIs.
 */
export const DEFAULT_BUSINESS_HOURS = [
  { day: 'Monday – Friday', time: '6:00 AM – 9:00 PM' },
  { day: 'Saturday', time: '8:00 AM – 6:00 PM' },
  { day: 'Sunday', time: '9:00 AM – 4:00 PM' },
];

export const DEFAULT_MEMBERSHIP_POLICY = {
  freezesPerYear: 2,
  maxFreezeDurationDays: 30,
  cancellationNoticeDays: 0,
  renewalReminderDaysBefore: [14, 7, 1],
};

export const DEFAULT_PAYMENT_METHODS = {
  card: true,
  upi: true,
  cash: true,
  bankTransfer: false,
};

export const DEFAULT_NOTIFICATION_PREFERENCES = {
  member: {
    booking: true,
    renewal: true,
    payment: true,
    attendance: true,
    announcement: true,
    promotion: true,
  },
  staff: {
    booking: true,
    class: true,
    attendance: true,
    announcement: true,
  },
};
