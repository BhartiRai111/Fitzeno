import { apiFetch, apiFetchPaginated, toQueryString } from "./client";
import type { PaginationParams, Paginated } from "./types";

export type BackendNotificationCategory =
  | "BOOKING"
  | "WAITLIST"
  | "CLASS"
  | "RENEWAL"
  | "PAYMENT"
  | "ATTENDANCE"
  | "LEAD"
  | "STAFF"
  | "ANNOUNCEMENT"
  | "PROMOTION"
  | "SYSTEM";

export type BackendNotificationPriority = "LOW" | "MEDIUM" | "HIGH";

export interface BackendNotification {
  id: string;
  category: BackendNotificationCategory;
  priority: BackendNotificationPriority;
  title: string;
  message: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  actionUrl: string | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface ListNotificationsParams extends PaginationParams {
  category?: BackendNotificationCategory;
  unread?: boolean;
}

export async function fetchOwnNotifications(params?: ListNotificationsParams): Promise<Paginated<BackendNotification>> {
  return apiFetchPaginated<BackendNotification>(`/notifications/me${toQueryString(params)}`);
}

export async function fetchUnreadCount(): Promise<number> {
  const { count } = await apiFetch<{ count: number }>("/notifications/me/unread-count");
  return count;
}

export async function markNotificationRead(id: string): Promise<BackendNotification> {
  return apiFetch<BackendNotification>(`/notifications/me/${id}/read`, { method: "POST" });
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiFetch<void>("/notifications/me/read-all", { method: "POST" });
}

export interface BackendNotificationPreference {
  category: BackendNotificationCategory;
  enabled: boolean;
  toggleable: boolean;
}

export async function fetchNotificationPreferences(): Promise<BackendNotificationPreference[]> {
  return apiFetch<BackendNotificationPreference[]>("/notifications/me/preferences");
}

export async function updateNotificationPreferences(
  preferences: { category: BackendNotificationCategory; enabled: boolean }[],
): Promise<BackendNotificationPreference[]> {
  return apiFetch<BackendNotificationPreference[]>("/notifications/me/preferences", {
    method: "PATCH",
    body: { preferences },
  });
}
