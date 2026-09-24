import { apiFetch, apiFetchPaginated, toQueryString } from "./client";
import type { PaginationParams, Paginated } from "./types";

export type BillingPeriod = "MONTH" | "YEAR";
export type PlanStatus = "ACTIVE" | "ARCHIVED";

export interface BackendMembershipPlan {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  price: number;
  billingPeriod: BillingPeriod;
  perks: string[];
  status: PlanStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ListMembershipPlansParams extends PaginationParams {
  status?: PlanStatus;
}

export async function fetchMembershipPlans(params?: ListMembershipPlansParams): Promise<Paginated<BackendMembershipPlan>> {
  return apiFetchPaginated<BackendMembershipPlan>(`/membership-plans${toQueryString(params)}`);
}

export async function fetchMembershipPlan(id: string): Promise<BackendMembershipPlan> {
  return apiFetch<BackendMembershipPlan>(`/membership-plans/${id}`);
}

export interface CreateMembershipPlanInput {
  name: string;
  description?: string;
  price: number;
  billingPeriod: BillingPeriod;
  perks?: string[];
}

export async function createMembershipPlan(input: CreateMembershipPlanInput): Promise<BackendMembershipPlan> {
  return apiFetch<BackendMembershipPlan>("/membership-plans", { method: "POST", body: input });
}

export async function updateMembershipPlan(id: string, input: Partial<CreateMembershipPlanInput>): Promise<BackendMembershipPlan> {
  return apiFetch<BackendMembershipPlan>(`/membership-plans/${id}`, { method: "PATCH", body: input });
}

export async function archiveMembershipPlan(id: string): Promise<BackendMembershipPlan> {
  return apiFetch<BackendMembershipPlan>(`/membership-plans/${id}/archive`, { method: "POST" });
}

export async function activateMembershipPlan(id: string): Promise<BackendMembershipPlan> {
  return apiFetch<BackendMembershipPlan>(`/membership-plans/${id}/activate`, { method: "POST" });
}
