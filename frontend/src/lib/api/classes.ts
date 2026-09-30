import { apiFetch, apiFetchPaginated, toQueryString } from "./client";
import type { PaginationParams, Paginated } from "./types";

export type DayOfWeek = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
export type ClassSeriesStatus = "ACTIVE" | "CANCELLED";
export type ClassOccurrenceStatus = "SCHEDULED" | "CANCELLED" | "COMPLETED";

interface ClassTrainerSummary {
  id: string;
  firstName: string;
  lastName: string;
}

export interface BackendClassSeries {
  id: string;
  tenantId: string;
  name: string;
  category: string;
  description: string | null;
  trainer: ClassTrainerSummary;
  dayOfWeek: DayOfWeek;
  startTime: string;
  durationMinutes: number;
  capacity: number;
  location: string;
  status: ClassSeriesStatus;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BackendClassOccurrence {
  id: string;
  classSeriesId: string;
  name: string;
  category: string;
  date: string;
  startTime: string;
  endTime: string;
  trainer: ClassTrainerSummary;
  location: string;
  capacity: number;
  confirmedCount: number;
  waitlistCount: number;
  seatsAvailable: number;
  status: ClassOccurrenceStatus;
  cancelledReason: string | null;
  myBookingStatus?: string | null;
}

export interface ListClassSeriesParams extends PaginationParams {
  trainerId?: string;
  category?: string;
  dayOfWeek?: DayOfWeek;
  status?: ClassSeriesStatus;
}

export async function fetchClassSeries(params?: ListClassSeriesParams): Promise<Paginated<BackendClassSeries>> {
  return apiFetchPaginated<BackendClassSeries>(`/classes/series${toQueryString(params)}`);
}

export async function fetchClassSeriesOne(id: string): Promise<BackendClassSeries> {
  return apiFetch<BackendClassSeries>(`/classes/series/${id}`);
}

export interface CreateClassSeriesInput {
  name: string;
  category: string;
  description?: string;
  trainerId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  durationMinutes: number;
  capacity: number;
  location: string;
  startDate?: string;
  endDate?: string;
}

export async function createClassSeries(input: CreateClassSeriesInput): Promise<BackendClassSeries> {
  return apiFetch<BackendClassSeries>("/classes/series", { method: "POST", body: input });
}

export type UpdateClassSeriesInput = Partial<Omit<CreateClassSeriesInput, "startDate">>;

export async function updateClassSeries(id: string, input: UpdateClassSeriesInput): Promise<BackendClassSeries> {
  return apiFetch<BackendClassSeries>(`/classes/series/${id}`, { method: "PATCH", body: input });
}

export async function cancelClassSeries(id: string, reason?: string): Promise<BackendClassSeries> {
  return apiFetch<BackendClassSeries>(`/classes/series/${id}/cancel`, { method: "POST", body: { reason } });
}

export interface ListClassOccurrencesParams extends PaginationParams {
  from?: string;
  to?: string;
  trainerId?: string;
  category?: string;
  status?: ClassOccurrenceStatus;
}

export async function fetchClassOccurrences(params?: ListClassOccurrencesParams): Promise<Paginated<BackendClassOccurrence>> {
  return apiFetchPaginated<BackendClassOccurrence>(`/classes${toQueryString(params)}`);
}

export async function fetchClassOccurrence(id: string): Promise<BackendClassOccurrence> {
  return apiFetch<BackendClassOccurrence>(`/classes/${id}`);
}

export interface UpdateClassOccurrenceInput {
  trainerId?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  capacity?: number;
}

export async function updateClassOccurrence(id: string, input: UpdateClassOccurrenceInput): Promise<BackendClassOccurrence> {
  return apiFetch<BackendClassOccurrence>(`/classes/${id}`, { method: "PATCH", body: input });
}

export async function cancelClassOccurrence(id: string, reason?: string): Promise<BackendClassOccurrence> {
  return apiFetch<BackendClassOccurrence>(`/classes/${id}/cancel`, { method: "POST", body: { reason } });
}
