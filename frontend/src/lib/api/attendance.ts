import { apiFetch, apiFetchPaginated, toQueryString } from "./client";
import type { PaginationParams, Paginated } from "./types";

export type CheckInMethod = "QR" | "MANUAL" | "KIOSK";
export type CheckInOutcome = "CHECKED_IN" | "ALREADY_CHECKED_IN" | "DENIED";
export type CheckInDenialReason =
  | "MEMBERSHIP_EXPIRED"
  | "MEMBERSHIP_FROZEN"
  | "MEMBERSHIP_CANCELLED"
  | "NO_MEMBERSHIP"
  | "MEMBER_INACTIVE";

interface CheckInMemberSummary {
  id: string;
  firstName: string;
  lastName: string;
}

export interface BackendCheckIn {
  id: string;
  member: CheckInMemberSummary;
  method: CheckInMethod;
  recordedByUserId: string | null;
  checkInAt: string;
  checkOutAt: string | null;
  createdAt: string;
}

export interface CheckInAttempt {
  outcome: CheckInOutcome;
  denialReason: CheckInDenialReason | null;
  message: string;
  checkIn: BackendCheckIn | null;
}

export interface CheckInStatus {
  checkedIn: boolean;
  checkIn: BackendCheckIn | null;
}

export interface CheckInToken {
  token: string;
  expiresAt: string;
  expiresInSeconds: number;
}

export interface TodayAttendance {
  items: BackendCheckIn[];
  totalToday: number;
  currentlyIn: number;
}

export interface AttendanceStatsPoint {
  date: string;
  visits: number;
}

export interface InactiveMember {
  memberId: string;
  firstName: string;
  lastName: string;
  lastCheckInAt: string | null;
  daysSinceLastVisit: number | null;
}

export interface ListAttendanceParams extends PaginationParams {
  memberId?: string;
  method?: CheckInMethod;
  open?: boolean;
  from?: string;
  to?: string;
}

// ---------------------------------------------------------------------------
// Self-service (member)
// ---------------------------------------------------------------------------

export async function issueCheckInToken(): Promise<CheckInToken> {
  return apiFetch<CheckInToken>("/attendance/check-in/token");
}

export async function checkInSelf(): Promise<CheckInAttempt> {
  return apiFetch<CheckInAttempt>("/attendance/check-in/me", { method: "POST" });
}

export async function checkOutSelf(): Promise<BackendCheckIn> {
  return apiFetch<BackendCheckIn>("/attendance/check-out/me", { method: "POST" });
}

export async function fetchOwnAttendanceStatus(): Promise<CheckInStatus> {
  return apiFetch<CheckInStatus>("/attendance/status/me");
}

export async function fetchOwnAttendanceHistory(params?: ListAttendanceParams): Promise<Paginated<BackendCheckIn>> {
  return apiFetchPaginated<BackendCheckIn>(`/attendance/history/me${toQueryString(params)}`);
}

// ---------------------------------------------------------------------------
// Front desk / staff
// ---------------------------------------------------------------------------

export interface ManualCheckInInput {
  memberId: string;
  method?: "MANUAL" | "KIOSK";
}

export async function checkInMember(input: ManualCheckInInput): Promise<CheckInAttempt> {
  return apiFetch<CheckInAttempt>("/attendance", { method: "POST", body: input });
}

export async function redeemCheckInToken(token: string): Promise<CheckInAttempt> {
  return apiFetch<CheckInAttempt>("/attendance/check-in/redeem", { method: "POST", body: { token } });
}

export async function checkOutById(checkInId: string): Promise<BackendCheckIn> {
  return apiFetch<BackendCheckIn>(`/attendance/${checkInId}/check-out`, { method: "POST" });
}

export async function fetchTodayAttendance(): Promise<TodayAttendance> {
  return apiFetch<TodayAttendance>("/attendance/today");
}

export async function fetchAttendanceHistory(params?: ListAttendanceParams): Promise<Paginated<BackendCheckIn>> {
  return apiFetchPaginated<BackendCheckIn>(`/attendance${toQueryString(params)}`);
}

export async function fetchAttendanceStats(from: string, to: string): Promise<AttendanceStatsPoint[]> {
  return apiFetch<AttendanceStatsPoint[]>(`/attendance/stats${toQueryString({ from, to })}`);
}

export async function fetchInactiveMembers(days?: number): Promise<InactiveMember[]> {
  return apiFetch<InactiveMember[]>(`/attendance/inactive-members${toQueryString({ days })}`);
}
