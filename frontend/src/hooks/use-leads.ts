"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as leadsApi from "@/lib/api/leads";
import { toInitials } from "@/lib/api/enum-maps";
import { useAuth } from "@/lib/auth/auth-context";
import type { Lead, LeadLostReason, LeadSource, LeadStatus } from "@/lib/data/types";

const STATUS_TO_FRONTEND: Record<leadsApi.BackendLeadStatus, LeadStatus> = {
  NEW: "new",
  CONTACTED: "contacted",
  FOLLOW_UP: "follow-up",
  TRIAL_SCHEDULED: "trial-booked",
  TRIAL_COMPLETED: "trial-attended",
  CONVERTED: "converted",
  LOST: "lost",
};

const STATUS_TO_BACKEND: Record<LeadStatus, leadsApi.BackendLeadStatus> = {
  new: "NEW",
  contacted: "CONTACTED",
  "follow-up": "FOLLOW_UP",
  "trial-booked": "TRIAL_SCHEDULED",
  "trial-attended": "TRIAL_COMPLETED",
  converted: "CONVERTED",
  lost: "LOST",
};

const SOURCE_TO_FRONTEND: Record<leadsApi.BackendLeadSource, LeadSource> = {
  WEBSITE: "Website",
  INSTAGRAM: "Instagram",
  REFERRAL: "Referral",
  WALK_IN: "Walk-in",
  ADVERTISEMENT: "Advertisement",
};

const SOURCE_TO_BACKEND: Record<LeadSource, leadsApi.BackendLeadSource> = {
  Website: "WEBSITE",
  Instagram: "INSTAGRAM",
  Referral: "REFERRAL",
  "Walk-in": "WALK_IN",
  Advertisement: "ADVERTISEMENT",
};

const LOST_REASON_TO_FRONTEND: Record<leadsApi.BackendLeadLostReason, LeadLostReason> = {
  NO_RESPONSE: "No response",
  NOT_INTERESTED: "Not interested",
  PRICE: "Price",
  CHOSE_ANOTHER_GYM: "Chose another gym",
  BAD_TIMING: "Bad timing",
  OTHER: "Other",
};

const LOST_REASON_TO_BACKEND: Record<LeadLostReason, leadsApi.BackendLeadLostReason> = {
  "No response": "NO_RESPONSE",
  "Not interested": "NOT_INTERESTED",
  Price: "PRICE",
  "Chose another gym": "CHOSE_ANOTHER_GYM",
  "Bad timing": "BAD_TIMING",
  Other: "OTHER",
};

export function leadSourceToBackend(source: LeadSource): leadsApi.BackendLeadSource {
  return SOURCE_TO_BACKEND[source];
}

export function leadStatusToBackend(status: LeadStatus): leadsApi.UpdateLeadInput["status"] {
  return STATUS_TO_BACKEND[status] as leadsApi.UpdateLeadInput["status"];
}

export function leadLostReasonToBackend(reason: LeadLostReason): leadsApi.BackendLeadLostReason {
  return LOST_REASON_TO_BACKEND[reason];
}

function toLegacyLead(l: leadsApi.BackendLeadSummary | leadsApi.BackendLead): Lead {
  const detail = "notes" in l ? l : null;
  return {
    id: l.id,
    name: `${l.firstName} ${l.lastName}`,
    initials: toInitials(l.firstName, l.lastName),
    email: l.email ?? "",
    phone: l.phone ?? "",
    source: SOURCE_TO_FRONTEND[l.source],
    interest: detail?.interest ?? "",
    status: STATUS_TO_FRONTEND[l.status],
    createdOn: l.createdAt,
    lastActivity: l.updatedAt,
    nextFollowUp: l.nextFollowUpAt,
    assignedTo: l.assignedTo ? `${l.assignedTo.firstName} ${l.assignedTo.lastName}` : "",
    notes: (detail?.notes ?? []).map((n) => ({
      id: n.id,
      author: n.author ? `${n.author.firstName} ${n.author.lastName}` : "Unknown",
      date: n.createdAt,
      text: n.body,
    })),
    lostReason: detail?.lostReason ? LOST_REASON_TO_FRONTEND[detail.lostReason] : undefined,
    trialDate: detail?.trialScheduledAt ?? undefined,
    trialNotes: detail?.trialNotes ?? undefined,
    convertedOn: detail?.convertedAt ?? undefined,
  };
}

export function useLeadsRoster() {
  const { status } = useAuth();
  const query = useQuery({
    queryKey: ["leads", "roster"],
    queryFn: () => leadsApi.fetchLeads({ limit: 100 }),
    enabled: status === "authenticated",
    staleTime: 30_000,
  });

  return {
    leads: (query.data?.items ?? []).map(toLegacyLead),
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

export function useLead(id: string) {
  const query = useQuery({
    queryKey: ["leads", id],
    queryFn: () => leadsApi.fetchLead(id),
    enabled: !!id,
  });

  return {
    lead: query.data ? toLegacyLead(query.data) : undefined,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: leadsApi.CreateLeadInput) => leadsApi.createLead(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: leadsApi.UpdateLeadInput }) => leadsApi.updateLead(id, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads", variables.id] });
    },
  });
}

export function useAddLeadNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => leadsApi.addLeadNote(id, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["leads", variables.id] });
    },
  });
}

export function useConvertLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input?: leadsApi.ConvertLeadInput }) => leadsApi.convertLead(id, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });
}
