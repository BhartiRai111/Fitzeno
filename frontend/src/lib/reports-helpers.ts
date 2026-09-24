import { addMonths } from "@/lib/membership-helpers";
import { daysBetween } from "@/lib/utils-data";
import { TODAY } from "@/lib/booking-helpers";
import type { Member, Payment, AttendanceRecord, Lead, GymClass } from "@/lib/data/types";

export { TODAY };

/** Earliest date with reasonably complete granular mock data (payments/attendance records). */
export const EARLIEST_DATA_DATE = "2026-08-01";

export type PeriodPreset = "today" | "week" | "month" | "last-month" | "custom";

export interface DateRange {
  start: string;
  end: string;
}

export interface Period {
  preset: PeriodPreset;
  range: DateRange;
  comparisonRange: DateRange;
  label: string;
  comparisonLabel: string;
}

export const PERIOD_PRESET_LABELS: Record<PeriodPreset, string> = {
  today: "Today",
  week: "This week",
  month: "This month",
  "last-month": "Last month",
  custom: "Custom range",
};

function addDays(dateISO: string, days: number): string {
  const d = new Date(`${dateISO}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function startOfWeek(dateISO: string): string {
  const d = new Date(`${dateISO}T00:00:00`);
  const diff = (d.getDay() + 6) % 7; // days since Monday
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

function startOfMonth(dateISO: string): string {
  return `${dateISO.slice(0, 7)}-01`;
}

function endOfMonth(dateISO: string): string {
  const d = new Date(`${startOfMonth(dateISO)}T00:00:00`);
  d.setMonth(d.getMonth() + 1);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Number of whole days spanned by a range, inclusive. */
function rangeLengthDays(range: DateRange): number {
  return daysBetween(range.start, range.end) + 1;
}

export function getPresetRange(preset: Exclude<PeriodPreset, "custom">, today: string = TODAY): DateRange {
  switch (preset) {
    case "today":
      return { start: today, end: today };
    case "week":
      return { start: startOfWeek(today), end: today };
    case "month":
      return { start: startOfMonth(today), end: today };
    case "last-month": {
      const lastMonthAnchor = addMonths(startOfMonth(today), -1);
      return { start: startOfMonth(lastMonthAnchor), end: endOfMonth(lastMonthAnchor) };
    }
  }
}

/** The immediately preceding period of equal length, used for "vs previous period" comparisons. */
export function getComparisonRange(preset: PeriodPreset, range: DateRange, today: string = TODAY): DateRange {
  if (preset === "month") {
    // Compare to the same point in the previous month, so a partial current month
    // isn't unfairly measured against a full previous one.
    const dayOfMonth = Number(today.slice(8, 10));
    const prevMonthAnchor = addMonths(startOfMonth(today), -1);
    const prevStart = startOfMonth(prevMonthAnchor);
    const prevMonthLastDay = Number(endOfMonth(prevMonthAnchor).slice(8, 10));
    const prevEnd = `${prevStart.slice(0, 7)}-${String(Math.min(dayOfMonth, prevMonthLastDay)).padStart(2, "0")}`;
    return { start: prevStart, end: prevEnd };
  }
  if (preset === "last-month") {
    const anchor = addMonths(range.start, -1);
    return { start: startOfMonth(anchor), end: endOfMonth(anchor) };
  }
  // today, week, and custom: shift back by the range's own length.
  const length = rangeLengthDays(range);
  return { start: addDays(range.start, -length), end: addDays(range.end, -length) };
}

function formatShort(dateISO: string): string {
  return new Date(`${dateISO}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function formatRangeLabel(range: DateRange): string {
  if (range.start === range.end) return formatShort(range.start);
  return `${formatShort(range.start)} – ${formatShort(range.end)}`;
}

export function buildPeriod(preset: PeriodPreset, custom?: DateRange, today: string = TODAY): Period {
  const range = preset === "custom" && custom ? custom : getPresetRange(preset as Exclude<PeriodPreset, "custom">, today);
  const comparisonRange = getComparisonRange(preset, range, today);
  return {
    preset,
    range,
    comparisonRange,
    label: preset === "custom" ? formatRangeLabel(range) : PERIOD_PRESET_LABELS[preset],
    comparisonLabel: `vs ${formatRangeLabel(comparisonRange)}`,
  };
}

/** True when a range starts well before the mock data has meaningful coverage. */
export function isBeyondDataCoverage(range: DateRange): boolean {
  return range.end < EARLIEST_DATA_DATE;
}

function inRange(dateISO: string, range: DateRange): boolean {
  return dateISO >= range.start && dateISO <= range.end;
}

// ---------------------------------------------------------------------------
// Trend / comparison formatting
// ---------------------------------------------------------------------------

export interface Trend {
  value: string;
  direction: "up" | "down";
  positive: boolean;
}

/**
 * Formats a current-vs-previous comparison as a StatCard trend.
 * Pass `invert: true` for metrics where a decrease is the good outcome (e.g. churn).
 * Returns undefined when there's nothing meaningful to compare against.
 */
export function percentTrend(current: number, previous: number, opts?: { invert?: boolean }): Trend | undefined {
  if (previous === 0) {
    if (current === 0) return undefined;
    return { value: "New", direction: "up", positive: !opts?.invert };
  }
  const change = ((current - previous) / previous) * 100;
  if (Math.abs(change) < 0.5) return { value: "Flat", direction: "up", positive: true };
  const direction: "up" | "down" = change > 0 ? "up" : "down";
  const positive = opts?.invert ? direction === "down" : direction === "up";
  return { value: `${change > 0 ? "+" : ""}${change.toFixed(0)}%`, direction, positive };
}

// ---------------------------------------------------------------------------
// Revenue
// ---------------------------------------------------------------------------

export function getRevenueInRange(payments: Payment[], range: DateRange): number {
  return payments
    .filter((p) => p.status === "paid" && inRange(p.date, range))
    .reduce((sum, p) => sum + p.amount, 0);
}

export function getPaymentsInRange(payments: Payment[], range: DateRange): Payment[] {
  return payments.filter((p) => inRange(p.date, range));
}

/** Paid revenue per calendar day within the range, for trend charts. */
export function getDailyRevenueInRange(payments: Payment[], range: DateRange) {
  const totals = new Map<string, number>();
  for (const p of payments) {
    if (p.status !== "paid" || !inRange(p.date, range)) continue;
    totals.set(p.date, (totals.get(p.date) ?? 0) + p.amount);
  }
  const days: { date: string; label: string; revenue: number }[] = [];
  let cursor = range.start;
  while (cursor <= range.end) {
    days.push({ date: cursor, label: formatShort(cursor), revenue: totals.get(cursor) ?? 0 });
    cursor = addDays(cursor, 1);
  }
  return days;
}

export function getRevenueByCategoryInRange(payments: Payment[], range: DateRange) {
  const paid = payments.filter((p) => p.status === "paid" && inRange(p.date, range));
  const total = paid.reduce((sum, p) => sum + p.amount, 0);
  const byCategory = new Map<string, number>();
  for (const p of paid) byCategory.set(p.category, (byCategory.get(p.category) ?? 0) + p.amount);
  return [...byCategory.entries()]
    .map(([category, amount]) => ({ category, amount, share: total > 0 ? Math.round((amount / total) * 100) : 0 }))
    .sort((a, b) => b.amount - a.amount);
}

/** A Membership-category paid payment counts as a renewal if it lands more than a few days after the member joined. */
export function isRenewalPayment(payment: Payment, members: Member[]): boolean {
  if (payment.category !== "Membership") return false;
  const member = members.find((m) => m.name === payment.memberName);
  if (!member) return false;
  return daysBetween(member.joinedOn, payment.date) > 3;
}

export function getRenewalsInRange(payments: Payment[], members: Member[], range: DateRange): Payment[] {
  return payments.filter(
    (p) => p.status === "paid" && p.category === "Membership" && inRange(p.date, range) && isRenewalPayment(p, members)
  );
}

// ---------------------------------------------------------------------------
// Members / churn
// ---------------------------------------------------------------------------

export function getNewMembersInRange(members: Member[], range: DateRange): Member[] {
  return members.filter((m) => inRange(m.joinedOn, range));
}

/** Members whose status turned expired/cancelled with an expiry date proxying the churn date. */
export function getChurnedInRange(members: Member[], range: DateRange): Member[] {
  return members.filter((m) => (m.status === "expired" || m.status === "cancelled") && inRange(m.expiresOn, range));
}

export function getExpiringSoon(members: Member[], today: string = TODAY, withinDays = 7): Member[] {
  return members.filter((m) => {
    const days = daysBetween(today, m.expiresOn);
    return (m.status === "active" || m.status === "expiring") && days >= 0 && days <= withinDays;
  });
}

export function getInactiveMembers(members: Member[], today: string = TODAY, minDaysInactive = 14): Member[] {
  return members.filter(
    (m) => m.status !== "cancelled" && m.status !== "expired" && daysBetween(m.lastCheckIn, today) >= minDaysInactive
  );
}

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

export function getAttendanceInRange(records: AttendanceRecord[], range: DateRange): AttendanceRecord[] {
  return records.filter((r) => inRange(r.date, range));
}

export function getUniqueVisitorsInRange(records: AttendanceRecord[], range: DateRange): number {
  return new Set(getAttendanceInRange(records, range).map((r) => r.memberId)).size;
}

/** Visits per calendar day within the range, for trend charts. */
export function getDailyAttendanceInRange(records: AttendanceRecord[], range: DateRange) {
  const counts = new Map<string, number>();
  for (const r of getAttendanceInRange(records, range)) {
    counts.set(r.date, (counts.get(r.date) ?? 0) + 1);
  }
  const days: { date: string; label: string; visits: number }[] = [];
  let cursor = range.start;
  while (cursor <= range.end) {
    days.push({ date: cursor, label: formatShort(cursor), visits: counts.get(cursor) ?? 0 });
    cursor = addDays(cursor, 1);
  }
  return days;
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

export function getLeadsCreatedInRange(leads: Lead[], range: DateRange): Lead[] {
  return leads.filter((l) => inRange(l.createdOn, range));
}

/** Leads whose most recent activity moved them to "converted" within the range — the closest proxy for a conversion date. */
export function getConversionsInRange(leads: Lead[], range: DateRange): Lead[] {
  return leads.filter((l) => l.status === "converted" && inRange(l.lastActivity, range));
}

// ---------------------------------------------------------------------------
// Classes
// ---------------------------------------------------------------------------

export interface ClassUtilization {
  gymClass: GymClass;
  utilization: number;
}

export function getClassUtilization(classes: GymClass[]): ClassUtilization[] {
  return classes
    .map((gymClass) => ({ gymClass, utilization: gymClass.capacity > 0 ? Math.round((gymClass.booked / gymClass.capacity) * 100) : 0 }))
    .sort((a, b) => b.utilization - a.utilization);
}

export const LOW_UTILIZATION_THRESHOLD = 50;
export const HIGH_UTILIZATION_THRESHOLD = 90;
