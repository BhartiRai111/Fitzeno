"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as attendanceApi from "@/lib/api/attendance";
import { toInitials } from "@/lib/api/enum-maps";
import { useAuth } from "@/lib/auth/auth-context";
import type { AttendanceRecord } from "@/lib/data/types";

const METHOD_MAP: Record<attendanceApi.CheckInMethod, AttendanceRecord["method"]> = {
  QR: "QR Check-in",
  MANUAL: "Manual",
  KIOSK: "Kiosk",
};

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Adapts a backend check-in into the existing `AttendanceRecord` shape —
 * so the approved Attendance/Check-in UI needs no changes at the
 * boundary. `plan` isn't carried on the check-in response itself (it's a
 * Member/Membership concern, not an attendance one) — left blank rather
 * than fabricated; callers with the member roster already loaded (see the
 * Owner Attendance page) can join it in themselves where it matters.
 */
function toLegacyRecord(c: attendanceApi.BackendCheckIn, plan = ""): AttendanceRecord {
  return {
    id: c.id,
    memberId: c.member.id,
    memberName: `${c.member.firstName} ${c.member.lastName}`,
    memberInitials: toInitials(c.member.firstName, c.member.lastName),
    plan,
    date: c.checkInAt.slice(0, 10),
    checkInTime: timeLabel(c.checkInAt),
    checkOutTime: c.checkOutAt ? timeLabel(c.checkOutAt) : null,
    method: METHOD_MAP[c.method],
  };
}

// ---------------------------------------------------------------------------
// Front desk / staff (Owner Attendance page)
// ---------------------------------------------------------------------------

export function useAttendanceToday() {
  const { status } = useAuth();
  const query = useQuery({
    queryKey: ["attendance", "today"],
    queryFn: () => attendanceApi.fetchTodayAttendance(),
    enabled: status === "authenticated",
    staleTime: 15_000,
  });

  return {
    records: (query.data?.items ?? []).map((c) => toLegacyRecord(c)),
    totalToday: query.data?.totalToday ?? 0,
    currentlyIn: query.data?.currentlyIn ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

export function useAttendanceHistory(params?: attendanceApi.ListAttendanceParams) {
  const { status } = useAuth();
  const query = useQuery({
    queryKey: ["attendance", "history", params],
    queryFn: () => attendanceApi.fetchAttendanceHistory({ limit: 100, ...params }),
    enabled: status === "authenticated",
    staleTime: 30_000,
  });

  return {
    records: (query.data?.items ?? []).map((c) => toLegacyRecord(c)),
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

export function useInactiveMembers(days = 14) {
  const { status } = useAuth();
  return useQuery({
    queryKey: ["attendance", "inactive-members", days],
    queryFn: () => attendanceApi.fetchInactiveMembers(days),
    enabled: status === "authenticated",
    staleTime: 60_000,
  });
}

export function useManualCheckIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: attendanceApi.ManualCheckInInput) => attendanceApi.checkInMember(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

export function useCheckOutById() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (checkInId: string) => attendanceApi.checkOutById(checkInId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Self-service (Member Check-in page)
// ---------------------------------------------------------------------------

export function useOwnAttendanceStatus() {
  const { status } = useAuth();
  return useQuery({
    queryKey: ["attendance", "status", "me"],
    queryFn: () => attendanceApi.fetchOwnAttendanceStatus(),
    enabled: status === "authenticated",
    staleTime: 15_000,
  });
}

export function useOwnAttendanceHistory() {
  const { status } = useAuth();
  const query = useQuery({
    queryKey: ["attendance", "history", "me"],
    queryFn: () => attendanceApi.fetchOwnAttendanceHistory({ limit: 60 }),
    enabled: status === "authenticated",
    staleTime: 30_000,
  });

  return {
    records: (query.data?.items ?? []).map((c) => toLegacyRecord(c)),
    isLoading: query.isLoading,
  };
}

export function useCheckInSelf() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => attendanceApi.checkInSelf(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

export function useCheckOutSelf() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => attendanceApi.checkOutSelf(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

export { toLegacyRecord as toLegacyAttendanceRecord };
