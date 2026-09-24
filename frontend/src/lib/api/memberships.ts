import { apiFetch, apiFetchPaginated, toQueryString } from "./client";
import type { PaginationParams, Paginated } from "./types";

export type EffectiveMembershipStatus = "PENDING" | "ACTIVE" | "EXPIRING" | "EXPIRED" | "FROZEN" | "CANCELLED";
export type MembershipRecordStatus = "PENDING" | "ACTIVE" | "FROZEN" | "CANCELLED" | "COMPLETED";
export type BillingPeriod = "MONTH" | "YEAR";

interface MembershipMemberSummary {
  id: string;
  firstName: string;
  lastName: string;
}

interface MembershipPlanSummary {
  id: string;
  name: string;
}

export interface BackendMembership {
  id: string;
  tenantId: string;
  member: MembershipMemberSummary;
  plan: MembershipPlanSummary;
  planName: string;
  price: number;
  billingPeriod: BillingPeriod;
  startDate: string;
  endDate: string;
  status: MembershipRecordStatus;
  effectiveStatus: Exclude<EffectiveMembershipStatus, "EXPIRING">;
  daysRemaining: number;
  isExpiringSoon: boolean;
  frozenAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  renewedFromId: string | null;
  renewedIntoId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListMembershipsParams extends PaginationParams {
  memberId?: string;
  planId?: string;
  effectiveStatus?: EffectiveMembershipStatus;
  endDateFrom?: string;
  endDateTo?: string;
}

export async function fetchMemberships(params?: ListMembershipsParams): Promise<Paginated<BackendMembership>> {
  return apiFetchPaginated<BackendMembership>(`/memberships${toQueryString(params)}`);
}

export interface MembershipStats {
  active: number;
  expiring: number;
  pending: number;
  expired: number;
  frozen: number;
  cancelled: number;
}

export async function fetchMembershipStats(): Promise<MembershipStats> {
  return apiFetch<MembershipStats>("/memberships/stats");
}

export async function fetchOwnCurrentMembership(): Promise<BackendMembership | null> {
  return apiFetch<BackendMembership | null>("/memberships/me");
}

export interface PurchaseMembershipInput {
  planId: string;
  paymentMethod?: string;
  paymentReference?: string;
}

export async function purchaseOrRenewOwnMembership(input: PurchaseMembershipInput): Promise<BackendMembership> {
  return apiFetch<BackendMembership>("/memberships/me", { method: "POST", body: input });
}

export async function fetchCurrentMembershipForMember(memberId: string): Promise<BackendMembership | null> {
  return apiFetch<BackendMembership | null>(`/memberships/member/${memberId}/current`);
}

export interface CreateMembershipInput {
  memberId: string;
  planId: string;
  startDate?: string;
  paymentMethod?: string;
  paymentReference?: string;
}

export async function createMembership(input: CreateMembershipInput): Promise<BackendMembership> {
  return apiFetch<BackendMembership>("/memberships", { method: "POST", body: input });
}

export async function renewMembership(id: string, input?: { planId?: string; paymentMethod?: string; paymentReference?: string }): Promise<BackendMembership> {
  return apiFetch<BackendMembership>(`/memberships/${id}/renew`, { method: "POST", body: input ?? {} });
}

export async function freezeMembership(id: string): Promise<BackendMembership> {
  return apiFetch<BackendMembership>(`/memberships/${id}/freeze`, { method: "POST" });
}

export async function unfreezeMembership(id: string): Promise<BackendMembership> {
  return apiFetch<BackendMembership>(`/memberships/${id}/unfreeze`, { method: "POST" });
}

export async function cancelMembership(id: string, reason?: string): Promise<BackendMembership> {
  return apiFetch<BackendMembership>(`/memberships/${id}/cancel`, { method: "POST", body: { reason } });
}
