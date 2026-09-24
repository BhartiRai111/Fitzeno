import { apiFetch, apiFetchPaginated, toQueryString } from "./client";
import type { PaginationParams, Paginated } from "./types";

export type BackendLeadStatus = "NEW" | "CONTACTED" | "FOLLOW_UP" | "TRIAL_SCHEDULED" | "TRIAL_COMPLETED" | "CONVERTED" | "LOST";
export type BackendLeadSource = "WEBSITE" | "INSTAGRAM" | "REFERRAL" | "WALK_IN" | "ADVERTISEMENT";
export type BackendLeadLostReason = "NO_RESPONSE" | "NOT_INTERESTED" | "PRICE" | "CHOSE_ANOTHER_GYM" | "BAD_TIMING" | "OTHER";

interface AssigneeSummary {
  id: string;
  firstName: string;
  lastName: string;
}

interface LeadNoteAuthor {
  id: string;
  firstName: string;
  lastName: string;
}

export interface BackendLeadNote {
  id: string;
  body: string;
  author: LeadNoteAuthor | null;
  createdAt: string;
}

export interface BackendLeadSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  source: BackendLeadSource;
  status: BackendLeadStatus;
  assignedTo: AssigneeSummary | null;
  nextFollowUpAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BackendLead extends BackendLeadSummary {
  tenantId: string;
  interest: string | null;
  lostReason: BackendLeadLostReason | null;
  trialScheduledAt: string | null;
  trialNotes: string | null;
  convertedAt: string | null;
  convertedMemberId: string | null;
  notes: BackendLeadNote[];
}

export interface ListLeadsParams extends PaginationParams {
  status?: BackendLeadStatus;
  source?: BackendLeadSource;
  assignedToId?: string;
  followUpDueBy?: string;
}

export async function fetchLeads(params?: ListLeadsParams): Promise<Paginated<BackendLeadSummary>> {
  return apiFetchPaginated<BackendLeadSummary>(`/leads${toQueryString(params)}`);
}

export async function fetchLead(id: string): Promise<BackendLead> {
  return apiFetch<BackendLead>(`/leads/${id}`);
}

export interface CreateLeadInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  source: BackendLeadSource;
  interest?: string;
  assignedToId?: string;
  nextFollowUpAt?: string;
}

export async function createLead(input: CreateLeadInput): Promise<BackendLead> {
  return apiFetch<BackendLead>("/leads", { method: "POST", body: input });
}

export interface UpdateLeadInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  source?: BackendLeadSource;
  interest?: string;
  status?: Exclude<BackendLeadStatus, "CONVERTED">;
  lostReason?: BackendLeadLostReason;
  assignedToId?: string | null;
  nextFollowUpAt?: string | null;
  trialScheduledAt?: string | null;
  trialNotes?: string | null;
}

export async function updateLead(id: string, input: UpdateLeadInput): Promise<BackendLead> {
  return apiFetch<BackendLead>(`/leads/${id}`, { method: "PATCH", body: input });
}

export async function addLeadNote(id: string, body: string): Promise<BackendLeadNote> {
  return apiFetch<BackendLeadNote>(`/leads/${id}/notes`, { method: "POST", body: { body } });
}

export interface ConvertLeadInput {
  trainerId?: string;
  joinedOn?: string;
}

export async function convertLead(id: string, input?: ConvertLeadInput) {
  return apiFetch<import("./members").BackendMember>(`/leads/${id}/convert`, { method: "POST", body: input ?? {} });
}
