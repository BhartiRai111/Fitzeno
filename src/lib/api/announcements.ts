import { apiFetch, apiFetchPaginated, toQueryString } from "./client";
import type { PaginationParams, Paginated } from "./types";

export type BackendAnnouncementAudience =
  | "ALL_MEMBERS"
  | "ACTIVE_MEMBERS"
  | "EXPIRING_MEMBERS"
  | "PLAN_MEMBERS"
  | "ALL_TRAINERS"
  | "ALL_STAFF"
  | "TRAINERS_AND_STAFF"
  | "SPECIFIC_MEMBERS";

export type BackendNotificationPriority = "LOW" | "MEDIUM" | "HIGH";

interface AnnouncementSender {
  id: string;
  firstName: string;
  lastName: string;
}

export interface BackendAnnouncement {
  id: string;
  title: string;
  message: string;
  priority: BackendNotificationPriority;
  audience: BackendAnnouncementAudience;
  audiencePlanId: string | null;
  recipientCount: number;
  sentBy: AnnouncementSender;
  createdAt: string;
}

export async function fetchAnnouncements(params?: PaginationParams): Promise<Paginated<BackendAnnouncement>> {
  return apiFetchPaginated<BackendAnnouncement>(`/announcements${toQueryString(params)}`);
}

export interface CreateAnnouncementInput {
  title: string;
  message: string;
  priority?: BackendNotificationPriority;
  audience: BackendAnnouncementAudience;
  planId?: string;
  memberIds?: string[];
}

export async function sendAnnouncement(input: CreateAnnouncementInput): Promise<BackendAnnouncement> {
  return apiFetch<BackendAnnouncement>("/announcements", { method: "POST", body: input });
}

export async function fetchAudienceCount(audience: BackendAnnouncementAudience, planId?: string): Promise<number> {
  const { count } = await apiFetch<{ count: number }>(`/announcements/audience-count${toQueryString({ audience, planId })}`);
  return count;
}
