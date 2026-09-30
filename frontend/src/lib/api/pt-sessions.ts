import { apiFetch, apiFetchPaginated, toQueryString } from "./client";
import type { PaginationParams, Paginated } from "./types";

export type PtSessionStatus = "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";

interface PtPersonSummary {
  id: string;
  firstName: string;
  lastName: string;
}

export interface BackendPtSession {
  id: string;
  trainer: PtPersonSummary;
  member: PtPersonSummary;
  date: string;
  startTime: string;
  durationMinutes: number;
  status: PtSessionStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FreeSlot {
  startTime: string;
  endTime: string;
}

export async function fetchAvailableSlots(trainerId: string, date: string): Promise<FreeSlot[]> {
  return apiFetch<FreeSlot[]>(`/pt-sessions/available-slots${toQueryString({ trainerId, date })}`);
}

export interface BookPtSessionInput {
  trainerId: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  notes?: string;
}

export async function bookPtAsSelf(input: BookPtSessionInput): Promise<BackendPtSession> {
  return apiFetch<BackendPtSession>("/pt-sessions/me", { method: "POST", body: input });
}

export interface ReschedulePtSessionInput {
  date?: string;
  startTime?: string;
  durationMinutes?: number;
}

export async function rescheduleOwnPtSession(id: string, input: ReschedulePtSessionInput): Promise<BackendPtSession> {
  return apiFetch<BackendPtSession>(`/pt-sessions/me/${id}`, { method: "PATCH", body: input });
}

export async function cancelOwnPtSession(id: string): Promise<BackendPtSession> {
  return apiFetch<BackendPtSession>(`/pt-sessions/me/${id}/cancel`, { method: "POST" });
}

export interface ListPtSessionsParams extends PaginationParams {
  trainerId?: string;
  memberId?: string;
  status?: PtSessionStatus;
  from?: string;
  to?: string;
}

export async function fetchOwnPtSessions(params?: ListPtSessionsParams): Promise<Paginated<BackendPtSession>> {
  return apiFetchPaginated<BackendPtSession>(`/pt-sessions/me${toQueryString(params)}`);
}

export interface BookPtSessionForMemberInput extends BookPtSessionInput {
  memberId: string;
}

export async function bookPtForMember(input: BookPtSessionForMemberInput): Promise<BackendPtSession> {
  return apiFetch<BackendPtSession>("/pt-sessions", { method: "POST", body: input });
}

export async function fetchPtSessions(params?: ListPtSessionsParams): Promise<Paginated<BackendPtSession>> {
  return apiFetchPaginated<BackendPtSession>(`/pt-sessions${toQueryString(params)}`);
}

export async function reschedulePtSession(id: string, input: ReschedulePtSessionInput): Promise<BackendPtSession> {
  return apiFetch<BackendPtSession>(`/pt-sessions/${id}`, { method: "PATCH", body: input });
}

export async function cancelPtSession(id: string): Promise<BackendPtSession> {
  return apiFetch<BackendPtSession>(`/pt-sessions/${id}/cancel`, { method: "POST" });
}

export type PtAttendanceStatus = "CONFIRMED" | "COMPLETED" | "NO_SHOW";

export async function markPtAttendance(id: string, status: PtAttendanceStatus): Promise<BackendPtSession> {
  return apiFetch<BackendPtSession>(`/pt-sessions/${id}/attendance`, { method: "POST", body: { status } });
}
