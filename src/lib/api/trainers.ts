import { apiFetch, apiFetchPaginated, toQueryString } from "./client";
import type { PaginationParams, Paginated } from "./types";

export type TrainerStatus = "ACTIVE" | "INACTIVE";
export type DayOfWeek = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";

interface TrainerUserSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
}

export interface AvailabilitySlot {
  id: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

export interface BackendTrainer {
  id: string;
  tenantId: string;
  userId: string;
  user: TrainerUserSummary;
  bio: string | null;
  specialties: string[];
  certifications: string[];
  yearsExperience: number | null;
  status: TrainerStatus;
  offersPersonalTraining: boolean;
  availability: AvailabilitySlot[];
  createdAt: string;
  updatedAt: string;
}

export interface ListTrainersParams extends PaginationParams {
  status?: TrainerStatus;
}

export async function fetchTrainers(params?: ListTrainersParams): Promise<Paginated<BackendTrainer>> {
  return apiFetchPaginated<BackendTrainer>(`/trainers${toQueryString(params)}`);
}

export async function fetchTrainer(id: string): Promise<BackendTrainer> {
  return apiFetch<BackendTrainer>(`/trainers/${id}`);
}

export async function fetchOwnTrainerProfile(): Promise<BackendTrainer> {
  return apiFetch<BackendTrainer>("/trainers/me");
}

export interface UpdateTrainerInput {
  bio?: string;
  specialties?: string[];
  certifications?: string[];
  yearsExperience?: number;
  status?: TrainerStatus;
  offersPersonalTraining?: boolean;
}

export async function updateTrainer(id: string, input: UpdateTrainerInput): Promise<BackendTrainer> {
  return apiFetch<BackendTrainer>(`/trainers/${id}`, { method: "PATCH", body: input });
}

export interface CreateAvailabilitySlotInput {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

export async function addTrainerAvailability(trainerId: string, input: CreateAvailabilitySlotInput): Promise<AvailabilitySlot> {
  return apiFetch<AvailabilitySlot>(`/trainers/${trainerId}/availability`, { method: "POST", body: input });
}

export async function addOwnAvailability(input: CreateAvailabilitySlotInput): Promise<AvailabilitySlot> {
  return apiFetch<AvailabilitySlot>("/trainers/me/availability", { method: "POST", body: input });
}

export async function removeTrainerAvailability(trainerId: string, slotId: string): Promise<void> {
  await apiFetch<void>(`/trainers/${trainerId}/availability/${slotId}`, { method: "DELETE" });
}

export async function removeOwnAvailability(slotId: string): Promise<void> {
  await apiFetch<void>(`/trainers/me/availability/${slotId}`, { method: "DELETE" });
}
