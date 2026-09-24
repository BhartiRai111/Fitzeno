import { apiFetch, apiFetchPaginated, toQueryString } from "./client";
import type { PaginationParams, Paginated } from "./types";

export type BackendMemberStatus = "ACTIVE" | "INACTIVE" | "PENDING";

interface TrainerSummary {
  id: string;
  firstName: string;
  lastName: string;
}

interface MemberNoteAuthor {
  id: string;
  firstName: string;
  lastName: string;
}

export interface BackendMemberNote {
  id: string;
  body: string;
  author: MemberNoteAuthor | null;
  createdAt: string;
}

export interface BackendMemberSummary {
  id: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  status: BackendMemberStatus;
  joinedOn: string;
  trainer: TrainerSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface BackendMember extends BackendMemberSummary {
  tenantId: string;
  gender: string | null;
  dateOfBirth: string | null;
  addressLine: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  convertedFromLead: { id: string; source: string; interest: string | null } | null;
  notes: BackendMemberNote[];
}

export interface ListMembersParams extends PaginationParams {
  status?: BackendMemberStatus;
  trainerId?: string;
}

export async function fetchMembers(params?: ListMembersParams): Promise<Paginated<BackendMemberSummary>> {
  return apiFetchPaginated<BackendMemberSummary>(`/members${toQueryString(params)}`);
}

export async function fetchMember(id: string): Promise<BackendMember> {
  return apiFetch<BackendMember>(`/members/${id}`);
}

export async function fetchOwnMemberProfile(): Promise<BackendMember> {
  return apiFetch<BackendMember>("/members/me");
}

export interface CreateMemberInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  addressLine?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  trainerId?: string;
  joinedOn?: string;
}

export async function createMember(input: CreateMemberInput): Promise<BackendMember> {
  return apiFetch<BackendMember>("/members", { method: "POST", body: input });
}

export interface UpdateMemberInput extends Omit<Partial<CreateMemberInput>, "trainerId"> {
  status?: BackendMemberStatus;
  trainerId?: string | null;
}

export async function updateMember(id: string, input: UpdateMemberInput): Promise<BackendMember> {
  return apiFetch<BackendMember>(`/members/${id}`, { method: "PATCH", body: input });
}

export async function addMemberNote(id: string, body: string): Promise<BackendMemberNote> {
  return apiFetch<BackendMemberNote>(`/members/${id}/notes`, { method: "POST", body: { body } });
}
