import { apiFetch, apiFetchPaginated, toQueryString } from "./client";
import type { PaginationParams, Paginated } from "./types";

export type ClassBookingStatus = "CONFIRMED" | "WAITLISTED" | "CANCELLED" | "ATTENDED" | "NO_SHOW";

interface BookingMemberSummary {
  id: string;
  firstName: string;
  lastName: string;
}

interface BookingOccurrenceSummary {
  id: string;
  name: string;
  date: string;
  startTime: string;
  location: string;
}

export interface BackendClassBooking {
  id: string;
  classOccurrence: BookingOccurrenceSummary;
  member: BookingMemberSummary;
  status: ClassBookingStatus;
  bookedAt: string;
  cancelledAt: string | null;
  createdAt: string;
}

export interface ListClassBookingsParams extends PaginationParams {
  classOccurrenceId?: string;
  memberId?: string;
  status?: ClassBookingStatus;
}

export async function bookClassAsSelf(classOccurrenceId: string): Promise<BackendClassBooking> {
  return apiFetch<BackendClassBooking>("/class-bookings/me", { method: "POST", body: { classOccurrenceId } });
}

export async function cancelOwnClassBooking(id: string): Promise<BackendClassBooking> {
  return apiFetch<BackendClassBooking>(`/class-bookings/me/${id}/cancel`, { method: "POST" });
}

export async function fetchOwnClassBookings(params?: ListClassBookingsParams): Promise<Paginated<BackendClassBooking>> {
  return apiFetchPaginated<BackendClassBooking>(`/class-bookings/me${toQueryString(params)}`);
}

export interface BookClassForMemberInput {
  classOccurrenceId: string;
  memberId: string;
}

export async function bookClassForMember(input: BookClassForMemberInput): Promise<BackendClassBooking> {
  return apiFetch<BackendClassBooking>("/class-bookings", { method: "POST", body: input });
}

export async function fetchClassBookings(params?: ListClassBookingsParams): Promise<Paginated<BackendClassBooking>> {
  return apiFetchPaginated<BackendClassBooking>(`/class-bookings${toQueryString(params)}`);
}

export async function fetchClassWaitlist(classOccurrenceId: string): Promise<BackendClassBooking[]> {
  return apiFetch<BackendClassBooking[]>(`/class-bookings/waitlist/${classOccurrenceId}`);
}

export async function cancelClassBooking(id: string): Promise<BackendClassBooking> {
  return apiFetch<BackendClassBooking>(`/class-bookings/${id}/cancel`, { method: "POST" });
}

export async function promoteClassBooking(id: string): Promise<BackendClassBooking> {
  return apiFetch<BackendClassBooking>(`/class-bookings/${id}/promote`, { method: "POST" });
}

export type ClassAttendanceStatus = "CONFIRMED" | "ATTENDED" | "NO_SHOW";

export async function markClassAttendance(id: string, status: ClassAttendanceStatus): Promise<BackendClassBooking> {
  return apiFetch<BackendClassBooking>(`/class-bookings/${id}/attendance`, { method: "POST", body: { status } });
}
