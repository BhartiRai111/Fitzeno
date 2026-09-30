"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ptApi from "@/lib/api/pt-sessions";
import { toInitials } from "@/lib/api/enum-maps";
import { useAuth } from "@/lib/auth/auth-context";
import type { PtSession } from "@/lib/data/types";

const STATUS_TO_LEGACY: Record<ptApi.PtSessionStatus, PtSession["status"]> = {
  CONFIRMED: "booked",
  CANCELLED: "cancelled",
  COMPLETED: "attended",
  NO_SHOW: "no-show",
};

export function toLegacyPtSession(s: ptApi.BackendPtSession): PtSession {
  return {
    id: s.id,
    memberId: s.member.id,
    memberName: `${s.member.firstName} ${s.member.lastName}`,
    memberInitials: toInitials(s.member.firstName, s.member.lastName),
    trainerId: s.trainer.id,
    date: s.date.slice(0, 10),
    startTime: s.startTime,
    duration: s.durationMinutes,
    status: STATUS_TO_LEGACY[s.status],
    notes: s.notes ?? undefined,
  };
}

export function useAvailableSlots(trainerId: string | null, date: string) {
  const { status } = useAuth();
  const query = useQuery({
    queryKey: ["pt-sessions", "available-slots", trainerId, date],
    queryFn: () => ptApi.fetchAvailableSlots(trainerId!, date),
    enabled: status === "authenticated" && !!trainerId && !!date,
    staleTime: 15_000,
  });

  return { slots: query.data ?? [], isLoading: query.isLoading };
}

export function useOwnPtSessions() {
  const { status } = useAuth();
  const query = useQuery({
    queryKey: ["pt-sessions", "me"],
    queryFn: () => ptApi.fetchOwnPtSessions({ limit: 100 }),
    enabled: status === "authenticated",
    staleTime: 15_000,
  });

  return { sessions: (query.data?.items ?? []).map(toLegacyPtSession), isLoading: query.isLoading };
}

export function usePtSessionsRoster(params?: ptApi.ListPtSessionsParams) {
  const { status } = useAuth();
  const query = useQuery({
    queryKey: ["pt-sessions", "roster", params],
    queryFn: () => ptApi.fetchPtSessions({ limit: 200, ...params }),
    enabled: status === "authenticated",
    staleTime: 15_000,
  });

  return { sessions: (query.data?.items ?? []).map(toLegacyPtSession), isLoading: query.isLoading, isError: query.isError };
}

export function useBookPt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ptApi.BookPtSessionInput) => ptApi.bookPtAsSelf(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pt-sessions"] });
    },
  });
}

export function useReschedulePt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ptApi.ReschedulePtSessionInput }) =>
      ptApi.rescheduleOwnPtSession(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pt-sessions"] });
    },
  });
}

export function useCancelOwnPt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ptApi.cancelOwnPtSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pt-sessions"] });
    },
  });
}

export function useBookPtForMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ptApi.BookPtSessionForMemberInput) => ptApi.bookPtForMember(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pt-sessions"] });
    },
  });
}

export function useCancelPt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ptApi.cancelPtSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pt-sessions"] });
    },
  });
}

export function useMarkPtAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ptApi.PtAttendanceStatus }) => ptApi.markPtAttendance(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pt-sessions"] });
    },
  });
}
