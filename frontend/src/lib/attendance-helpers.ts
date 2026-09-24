import { TODAY, NOW_ISO, DEMO_MEMBER_ID } from "@/lib/booking-helpers";
import { gymProfile } from "@/lib/data/gym";
import type { AttendanceRecord, MembershipStatus } from "@/lib/data/types";

export { TODAY, NOW_ISO, DEMO_MEMBER_ID };

/** A member's attendance records, most recent first. */
export function getMemberRecords(records: AttendanceRecord[], memberId: string): AttendanceRecord[] {
  return records
    .filter((r) => r.memberId === memberId)
    .sort((a, b) => (a.date === b.date ? b.checkInTime.localeCompare(a.checkInTime) : a.date < b.date ? 1 : -1));
}

export function getVisitsInMonth(records: AttendanceRecord[], memberId: string, monthPrefix: string = TODAY.slice(0, 7)): number {
  return records.filter((r) => r.memberId === memberId && r.date.startsWith(monthPrefix)).length;
}

/** Consecutive-day visit streak ending today (or yesterday, if today has no visit yet). */
export function getCurrentStreak(records: AttendanceRecord[], memberId: string, today: string = TODAY): number {
  const dateSet = new Set(records.filter((r) => r.memberId === memberId).map((r) => r.date));
  if (dateSet.size === 0) return 0;

  let cursor = new Date(`${today}T00:00:00`);
  let cursorStr = cursor.toISOString().slice(0, 10);
  if (!dateSet.has(cursorStr)) {
    cursor.setDate(cursor.getDate() - 1);
    cursorStr = cursor.toISOString().slice(0, 10);
    if (!dateSet.has(cursorStr)) return 0;
  }

  let streak = 0;
  while (dateSet.has(cursorStr)) {
    streak++;
    cursor = new Date(`${cursorStr}T00:00:00`);
    cursor.setDate(cursor.getDate() - 1);
    cursorStr = cursor.toISOString().slice(0, 10);
  }
  return streak;
}

export interface MembershipBlock {
  title: string;
  detail: string;
}

/** Reasons a member's membership would block them from checking in. */
export function getMembershipBlock(status: MembershipStatus): MembershipBlock | null {
  switch (status) {
    case "expired":
      return { title: "Membership expired", detail: "Renew your plan at the front desk or online to check in again." };
    case "frozen":
      return { title: "Membership frozen", detail: "Unfreeze your membership from Billing to resume check-ins." };
    case "cancelled":
      return { title: "Membership cancelled", detail: "Contact the front desk to reactivate your account." };
    default:
      return null;
  }
}

function parseTimeToMinutes(time: string): number {
  const match = time.trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

const DAY_NAME_INDEX: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

function dayMatchesLabel(dayIndex: number, label: string): boolean {
  if (label.includes("–")) {
    const [startName, endName] = label.split("–").map((s) => s.trim());
    const start = DAY_NAME_INDEX[startName];
    const end = DAY_NAME_INDEX[endName];
    if (start !== undefined && end !== undefined) return dayIndex >= start && dayIndex <= end;
  }
  return DAY_NAME_INDEX[label.trim()] === dayIndex;
}

export interface GymOpenState {
  open: boolean;
  opensAt: string;
  closesAt: string;
}

/** Whether the gym is open right now, based on gymProfile.hours. */
export function getGymOpenState(nowISO: string = NOW_ISO): GymOpenState {
  const now = new Date(nowISO);
  const dayIndex = now.getDay();
  const minutesNow = now.getHours() * 60 + now.getMinutes();

  for (const block of gymProfile.hours) {
    if (!dayMatchesLabel(dayIndex, block.day)) continue;
    const [openLabel, closeLabel] = block.time.split("–").map((s) => s.trim());
    const openMin = parseTimeToMinutes(openLabel);
    const closeMin = parseTimeToMinutes(closeLabel);
    return {
      open: minutesNow >= openMin && minutesNow < closeMin,
      opensAt: openLabel,
      closesAt: closeLabel,
    };
  }
  return { open: true, opensAt: "", closesAt: "" };
}

export function nowTimeLabel(nowISO: string = NOW_ISO): string {
  return new Date(nowISO).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/** Minutes between two 24-hour "HH:MM" times. */
export function minutesBetween(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}
