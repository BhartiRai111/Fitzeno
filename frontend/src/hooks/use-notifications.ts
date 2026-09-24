"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as notificationsApi from "@/lib/api/notifications";
import type { BackendNotification, BackendNotificationCategory, BackendNotificationPriority } from "@/lib/api/notifications";
import { useAuth } from "@/lib/auth/auth-context";
import { CATEGORY_META } from "@/lib/notification-meta";
import type { NotificationCategory, NotificationItem, NotificationPriority } from "@/lib/data/types";

const CATEGORY_MAP: Record<BackendNotificationCategory, NotificationCategory> = {
  BOOKING: "booking",
  WAITLIST: "waitlist",
  CLASS: "class",
  RENEWAL: "renewal",
  PAYMENT: "payment",
  ATTENDANCE: "attendance",
  LEAD: "lead",
  STAFF: "staff",
  ANNOUNCEMENT: "announcement",
  PROMOTION: "promotion",
  SYSTEM: "system",
};

const CATEGORY_TO_BACKEND: Partial<Record<NotificationCategory, BackendNotificationCategory>> = Object.fromEntries(
  Object.entries(CATEGORY_MAP).map(([backend, frontend]) => [frontend, backend]),
) as Partial<Record<NotificationCategory, BackendNotificationCategory>>;

const PRIORITY_MAP: Record<BackendNotificationPriority, NotificationPriority> = {
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
};

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Adapts a backend notification into the exact shape every existing notification UI (topbar bell, NotificationCenter) already renders — see NotificationItem in lib/data/types.ts. */
export function toNotificationItem(n: BackendNotification): NotificationItem {
  return {
    id: n.id,
    type: CATEGORY_MAP[n.category],
    title: n.title,
    description: n.message,
    timestamp: formatTimestamp(n.createdAt),
    read: n.read,
    priority: PRIORITY_MAP[n.priority],
    href: n.actionUrl ?? undefined,
  };
}

/** The caller's own notifications, newest first — feeds the topbar bell and every role's Notifications page. Backend-owned; nothing here is ever fabricated client-side. */
export function useOwnNotifications(params?: notificationsApi.ListNotificationsParams) {
  const { status, user } = useAuth();
  return useQuery({
    queryKey: ["notifications", "me", user?.id, params],
    queryFn: () => notificationsApi.fetchOwnNotifications({ limit: 50, ...params }),
    enabled: status === "authenticated" && !!user,
    staleTime: 30_000,
    select: (result) => ({ items: result.items.map(toNotificationItem), meta: result.meta }),
  });
}

export function useUnreadNotificationCount() {
  const { status, user } = useAuth();
  return useQuery({
    queryKey: ["notifications", "unread-count", user?.id],
    queryFn: () => notificationsApi.fetchUnreadCount(),
    enabled: status === "authenticated" && !!user,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

/** The categories the caller's role can toggle, each with its current enabled state — drives every role's Notification preferences panel. */
export function useNotificationPreferences() {
  const { status, user } = useAuth();
  const query = useQuery({
    queryKey: ["notifications", "preferences", user?.id],
    queryFn: () => notificationsApi.fetchNotificationPreferences(),
    enabled: status === "authenticated" && !!user,
    staleTime: 60_000,
  });

  return {
    preferences: (query.data ?? []).map((p) => ({
      category: CATEGORY_MAP[p.category],
      label: CATEGORY_META[CATEGORY_MAP[p.category]].label,
      enabled: p.enabled,
      toggleable: p.toggleable,
    })),
    isLoading: query.isLoading,
  };
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (preferences: { category: NotificationCategory; enabled: boolean }[]) =>
      notificationsApi.updateNotificationPreferences(
        preferences
          .filter((p) => CATEGORY_TO_BACKEND[p.category])
          .map((p) => ({ category: CATEGORY_TO_BACKEND[p.category]!, enabled: p.enabled })),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", "preferences"] });
    },
  });
}
