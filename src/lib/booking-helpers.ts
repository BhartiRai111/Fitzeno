import { trainerAvailability } from "@/lib/data/trainer-availability";
import type { ClassBooking, GymClass, PtSession, TrainerAvailabilitySlot } from "@/lib/data/types";

/** Fixed "current moment" for this demo build — no live backend/clock. */
export const TODAY = "2026-09-21";
export const TODAY_DAY: GymClass["day"] = "Mon";
export const NOW_ISO = "2026-09-21T14:00:00";
export const CANCELLATION_WINDOW_HOURS = 4;
export const DEMO_MEMBER_ID = "m-1";
export const DEMO_TRAINER_ID = "tr-1";

const DAY_INDEX: Record<GymClass["day"], number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const INDEX_DAY = Object.fromEntries(Object.entries(DAY_INDEX).map(([k, v]) => [v, k])) as Record<
  number,
  GymClass["day"]
>;

export function dayFromDate(dateISO: string): GymClass["day"] {
  return INDEX_DAY[new Date(`${dateISO}T00:00:00`).getDay()];
}

export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60)
    .toString()
    .padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

/** Next calendar date (ISO) on/after `fromISO` that falls on the given weekday. */
export function getNextOccurrenceDate(day: GymClass["day"], fromISO: string = TODAY): string {
  const from = new Date(`${fromISO}T00:00:00`);
  const target = DAY_INDEX[day];
  let diff = target - from.getDay();
  if (diff < 0) diff += 7;
  const result = new Date(from);
  result.setDate(from.getDate() + diff);
  return result.toISOString().slice(0, 10);
}

export function formatOccurrence(day: GymClass["day"], fromISO: string = TODAY): string {
  const iso = getNextOccurrenceDate(day, fromISO);
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function hoursUntil(dateISO: string, time: string): number {
  const target = new Date(`${dateISO}T${time}:00`);
  const now = new Date(NOW_ISO);
  return (target.getTime() - now.getTime()) / (1000 * 60 * 60);
}

export function isPast(dateISO: string, time: string): boolean {
  return hoursUntil(dateISO, time) < 0;
}

export function isWithinCancellationWindow(dateISO: string, time: string): boolean {
  const hrs = hoursUntil(dateISO, time);
  return hrs >= 0 && hrs < CANCELLATION_WINDOW_HOURS;
}

interface TimeRange {
  start: number;
  end: number;
}

function overlaps(a: TimeRange, b: TimeRange) {
  return a.start < b.end && b.start < a.end;
}

export interface ScheduleConflict {
  label: string;
}

/** Classes a trainer already teaches that would overlap a proposed day/time — used by the owner's class editor. */
export function getTrainerClassConflicts(
  classes: GymClass[],
  trainerId: string,
  day: GymClass["day"],
  startTime: string,
  duration: number,
  excludeClassId?: string
): ScheduleConflict[] {
  const proposed: TimeRange = { start: toMinutes(startTime), end: toMinutes(startTime) + duration };
  return classes
    .filter((c) => c.trainerId === trainerId && c.day === day && c.id !== excludeClassId)
    .filter((c) => overlaps(proposed, { start: toMinutes(c.startTime), end: toMinutes(c.startTime) + c.duration }))
    .map((c) => ({ label: `${c.name} · ${c.day} ${c.startTime}–${minutesToTime(toMinutes(c.startTime) + c.duration)}` }));
}

/** Booked/no-show-pending PT sessions for a trainer that would overlap a proposed day/time. */
export function getTrainerPtConflicts(
  ptSessions: PtSession[],
  trainerId: string,
  day: GymClass["day"],
  startTime: string,
  duration: number,
  fromISO: string = TODAY
): ScheduleConflict[] {
  const occurrenceDate = getNextOccurrenceDate(day, fromISO);
  const proposed: TimeRange = { start: toMinutes(startTime), end: toMinutes(startTime) + duration };
  return ptSessions
    .filter((s) => s.trainerId === trainerId && s.date === occurrenceDate && (s.status === "booked" || s.status === "attended"))
    .filter((s) => overlaps(proposed, { start: toMinutes(s.startTime), end: toMinutes(s.startTime) + s.duration }))
    .map((s) => ({ label: `PT session with ${s.memberName} · ${s.startTime}` }));
}

export interface FreeSlot {
  day: GymClass["day"];
  occurrenceDate: string;
  startTime: string;
  endTime: string;
}

/**
 * Bookable PT slots for a trainer, derived from their weekly availability minus
 * classes they teach and PT sessions already on the books. Offered in 30-minute increments.
 */
export function getTrainerFreeSlots(
  classes: GymClass[],
  ptSessions: PtSession[],
  trainerId: string,
  durationMinutes = 45,
  step = 30
): FreeSlot[] {
  const slots: FreeSlot[] = [];

  trainerAvailability
    .filter((a: TrainerAvailabilitySlot) => a.trainerId === trainerId)
    .forEach((block) => {
      const occurrenceDate = getNextOccurrenceDate(block.day);
      const busy: TimeRange[] = [
        ...classes
          .filter((c) => c.trainerId === trainerId && c.day === block.day)
          .map((c) => ({ start: toMinutes(c.startTime), end: toMinutes(c.startTime) + c.duration })),
        ...ptSessions
          .filter((s) => s.trainerId === trainerId && s.date === occurrenceDate && (s.status === "booked" || s.status === "attended"))
          .map((s) => ({ start: toMinutes(s.startTime), end: toMinutes(s.startTime) + s.duration })),
      ];

      const blockEnd = toMinutes(block.endTime);
      for (let cursor = toMinutes(block.startTime); cursor + durationMinutes <= blockEnd; cursor += step) {
        const candidate: TimeRange = { start: cursor, end: cursor + durationMinutes };
        if (isPast(occurrenceDate, minutesToTime(cursor))) continue;
        if (busy.some((b) => overlaps(candidate, b))) continue;
        slots.push({
          day: block.day,
          occurrenceDate,
          startTime: minutesToTime(cursor),
          endTime: minutesToTime(cursor + durationMinutes),
        });
      }
    });

  return slots.sort((a, b) => (a.occurrenceDate + a.startTime).localeCompare(b.occurrenceDate + b.startTime));
}

/** A member's own booked classes/PT sessions that would overlap a proposed class or session. */
export function getMemberScheduleConflicts(
  classes: GymClass[],
  bookings: ClassBooking[],
  ptSessions: PtSession[],
  memberId: string,
  day: GymClass["day"],
  startTime: string,
  duration: number,
  excludeClassId?: string
): ScheduleConflict[] {
  const occurrenceDate = getNextOccurrenceDate(day);
  const proposed: TimeRange = { start: toMinutes(startTime), end: toMinutes(startTime) + duration };
  const conflicts: ScheduleConflict[] = [];

  bookings
    .filter((b) => b.memberId === memberId && b.status === "booked" && b.classId !== excludeClassId)
    .forEach((b) => {
      const gymClass = classes.find((c) => c.id === b.classId);
      if (!gymClass || gymClass.day !== day) return;
      const range: TimeRange = { start: toMinutes(gymClass.startTime), end: toMinutes(gymClass.startTime) + gymClass.duration };
      if (overlaps(proposed, range)) conflicts.push({ label: `${gymClass.name} · ${gymClass.startTime}` });
    });

  ptSessions
    .filter((s) => s.memberId === memberId && s.status === "booked" && s.date === occurrenceDate)
    .forEach((s) => {
      const range: TimeRange = { start: toMinutes(s.startTime), end: toMinutes(s.startTime) + s.duration };
      if (overlaps(proposed, range)) conflicts.push({ label: `Personal training · ${s.startTime}` });
    });

  return conflicts;
}
