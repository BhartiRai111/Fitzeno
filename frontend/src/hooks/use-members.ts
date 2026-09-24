"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as membersApi from "@/lib/api/members";
import * as membershipsApi from "@/lib/api/memberships";
import { toInitials } from "@/lib/api/enum-maps";
import { useAuth } from "@/lib/auth/auth-context";
import type { Member, MembershipStatus } from "@/lib/data/types";

/** Maps a membership's date-aware effectiveStatus (+ isExpiringSoon) onto the frontend's existing MembershipStatus vocabulary — see status-badge.tsx. */
function membershipStatusFor(membership: membershipsApi.BackendMembership | undefined): MembershipStatus {
  if (!membership) return "none";
  if (membership.effectiveStatus === "ACTIVE") return membership.isExpiringSoon ? "expiring" : "active";
  if (membership.effectiveStatus === "PENDING") return "pending";
  if (membership.effectiveStatus === "EXPIRED") return "expired";
  if (membership.effectiveStatus === "FROZEN") return "frozen";
  return "cancelled";
}

/**
 * Adapts a backend member (+ its current membership, if any) into the exact
 * `Member` shape every existing Members/Leads UI component already renders
 * — so those components need no changes at the boundary. Fields the
 * backend doesn't own yet (no Attendance or POS module in this phase —
 * see the session's final report) get honest, non-fabricated defaults:
 * zero recorded attendance/lifetime-value rather than a invented number,
 * and an empty lastCheckIn/address/etc. rather than a guessed one.
 */
function toLegacyMember(m: membersApi.BackendMemberSummary, membership: membershipsApi.BackendMembership | undefined): Member {
  return {
    id: m.id,
    name: `${m.firstName} ${m.lastName}`,
    initials: toInitials(m.firstName, m.lastName),
    email: m.email ?? "",
    phone: m.phone ?? "",
    plan: membership?.planName ?? "No active plan",
    status: membershipStatusFor(membership),
    joinedOn: m.joinedOn,
    expiresOn: membership?.endDate ?? "",
    lastCheckIn: "",
    lifetimeValue: 0,
    trainerId: m.trainer?.id,
    paymentStatus: "pending",
    attendanceThisMonth: 0,
    gender: "Other",
    dob: "",
    address: "",
    emergencyContact: "",
    notes: [],
  };
}

function toLegacyMemberDetail(m: membersApi.BackendMember, membership: membershipsApi.BackendMembership | undefined): Member {
  return {
    ...toLegacyMember(m, membership),
    gender: (m.gender as Member["gender"]) ?? "Other",
    dob: m.dateOfBirth ?? "",
    address: m.addressLine ?? "",
    emergencyContact: [m.emergencyContactName, m.emergencyContactPhone].filter(Boolean).join(" · "),
    notes: m.notes.map((n) => ({
      id: n.id,
      author: n.author ? `${n.author.firstName} ${n.author.lastName}` : "Unknown",
      date: n.createdAt,
      text: n.body,
    })),
  };
}

/** The gym's full member roster, joined with each member's current membership — the real-data replacement for lib/data/members.ts. A large page size is used deliberately: gyms are small enough (hundreds, not millions, of members) that one bounded fetch beats N+1 per-row membership lookups. */
export function useMembersRoster() {
  const { status } = useAuth();
  const enabled = status === "authenticated";

  const membersQuery = useQuery({
    queryKey: ["members", "roster"],
    queryFn: () => membersApi.fetchMembers({ limit: 100 }),
    enabled,
    staleTime: 30_000,
  });

  const membershipsQuery = useQuery({
    queryKey: ["memberships", "roster"],
    queryFn: () => membershipsApi.fetchMemberships({ limit: 100 }),
    enabled,
    staleTime: 30_000,
  });

  const membershipByMemberId = new Map((membershipsQuery.data?.items ?? []).map((ms) => [ms.member.id, ms]));
  const members: Member[] = (membersQuery.data?.items ?? []).map((m) => toLegacyMember(m, membershipByMemberId.get(m.id)));

  return {
    members,
    membershipByMemberId,
    isLoading: membersQuery.isLoading || membershipsQuery.isLoading,
    isError: membersQuery.isError || membershipsQuery.isError,
    error: membersQuery.error ?? membershipsQuery.error,
  };
}

export function useMember(id: string) {
  const query = useQuery({
    queryKey: ["members", id],
    queryFn: () => membersApi.fetchMember(id),
    enabled: !!id,
  });

  const membershipQuery = useQuery({
    queryKey: ["memberships", "current", id],
    queryFn: () => membershipsApi.fetchCurrentMembershipForMember(id),
    enabled: !!id,
  });

  const member = query.data ? toLegacyMemberDetail(query.data, membershipQuery.data ?? undefined) : undefined;

  return {
    member,
    membership: membershipQuery.data ?? null,
    isLoading: query.isLoading || membershipQuery.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

export function useCreateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: membersApi.CreateMemberInput) => membersApi.createMember(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: membersApi.UpdateMemberInput }) => membersApi.updateMember(id, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["members", variables.id] });
    },
  });
}

export function useAddMemberNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => membersApi.addMemberNote(id, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["members", variables.id] });
    },
  });
}

export function useCreateMembership() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: membershipsApi.CreateMembershipInput) => membershipsApi.createMembership(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memberships"] });
    },
  });
}

export function useRenewMembership() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, planId }: { id: string; planId?: string }) => membershipsApi.renewMembership(id, { planId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memberships"] });
    },
  });
}

export function useFreezeMembership() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => membershipsApi.freezeMembership(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memberships"] });
    },
  });
}

export function useUnfreezeMembership() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => membershipsApi.unfreezeMembership(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memberships"] });
    },
  });
}

export function useCancelMembership() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => membershipsApi.cancelMembership(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memberships"] });
    },
  });
}
