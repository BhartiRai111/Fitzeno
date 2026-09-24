"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as announcementsApi from "@/lib/api/announcements";
import type { BackendAnnouncementAudience } from "@/lib/api/announcements";
import { useAuth } from "@/lib/auth/auth-context";
import type { NotificationPriority, SentAnnouncement } from "@/lib/data/types";

const PRIORITY_TO_FRONTEND: Record<announcementsApi.BackendNotificationPriority, NotificationPriority> = {
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
};

const AUDIENCE_LABELS: Record<BackendAnnouncementAudience, string> = {
  ALL_MEMBERS: "All members",
  ACTIVE_MEMBERS: "Active members",
  EXPIRING_MEMBERS: "Members expiring soon",
  PLAN_MEMBERS: "Members on this plan",
  ALL_TRAINERS: "All trainers",
  ALL_STAFF: "All staff",
  TRAINERS_AND_STAFF: "All trainers & staff",
  SPECIFIC_MEMBERS: "Selected members",
};

function toLegacyAnnouncement(a: announcementsApi.BackendAnnouncement): SentAnnouncement {
  return {
    id: a.id,
    title: a.title,
    message: a.message,
    audienceLabel: AUDIENCE_LABELS[a.audience],
    recipientCount: a.recipientCount,
    priority: PRIORITY_TO_FRONTEND[a.priority],
    sentBy: `${a.sentBy.firstName} ${a.sentBy.lastName}`,
    sentOn: a.createdAt,
  };
}

export function useAnnouncements() {
  const { status } = useAuth();
  const query = useQuery({
    queryKey: ["announcements"],
    queryFn: () => announcementsApi.fetchAnnouncements({ limit: 50 }),
    enabled: status === "authenticated",
    staleTime: 30_000,
  });

  return {
    announcements: (query.data?.items ?? []).map(toLegacyAnnouncement),
    isLoading: query.isLoading,
  };
}

export function useAudienceCount(audience: BackendAnnouncementAudience, planId?: string) {
  const { status } = useAuth();
  return useQuery({
    queryKey: ["announcements", "audience-count", audience, planId],
    queryFn: () => announcementsApi.fetchAudienceCount(audience, planId),
    enabled: status === "authenticated",
    staleTime: 60_000,
  });
}

export function useSendAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: announcementsApi.CreateAnnouncementInput) => announcementsApi.sendAnnouncement(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
  });
}
