"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as classBookingsApi from "@/lib/api/class-bookings";
import * as classesApi from "@/lib/api/classes";
import { toLegacyClassFromOccurrence } from "@/hooks/use-classes";
import { toInitials } from "@/lib/api/enum-maps";
import { useAuth } from "@/lib/auth/auth-context";
import type { ClassBooking, GymClass } from "@/lib/data/types";

const STATUS_TO_LEGACY: Record<classBookingsApi.ClassBookingStatus, ClassBooking["status"]> = {
  CONFIRMED: "booked",
  WAITLISTED: "waitlisted",
  CANCELLED: "cancelled",
  ATTENDED: "attended",
  NO_SHOW: "no-show",
};

export function toLegacyClassBooking(b: classBookingsApi.BackendClassBooking): ClassBooking {
  return {
    id: b.id,
    classId: b.classOccurrence.id,
    memberId: b.member.id,
    memberName: `${b.member.firstName} ${b.member.lastName}`,
    memberInitials: toInitials(b.member.firstName, b.member.lastName),
    bookedOn: b.bookedAt.slice(0, 10),
    status: STATUS_TO_LEGACY[b.status],
  };
}

/** The gym's class bookings — the real-data replacement for lib/data/class-bookings.ts on the owner's Bookings/Waitlist tabs. The embedded occurrence summary (name/date/location) already covers what those tabs display, so no per-row occurrence fetch is needed here. */
export function useClassBookingsRoster(params?: classBookingsApi.ListClassBookingsParams) {
  const { status } = useAuth();
  const query = useQuery({
    queryKey: ["class-bookings", "roster", params],
    queryFn: () => classBookingsApi.fetchClassBookings({ limit: 200, ...params }),
    enabled: status === "authenticated",
    staleTime: 15_000,
  });

  return {
    bookings: (query.data?.items ?? []).map(toLegacyClassBooking),
    raw: query.data?.items ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

export interface MemberClassBookingView {
  booking: ClassBooking;
  gymClass: GymClass;
  occurrenceDate: string;
  waitlistPosition: number | null;
}

function fallbackClassFromSummary(b: classBookingsApi.BackendClassBooking): GymClass {
  const date = b.classOccurrence.date.slice(0, 10);
  return {
    id: b.classOccurrence.id,
    name: b.classOccurrence.name,
    type: "",
    trainerId: "",
    day: "Mon",
    date,
    startTime: b.classOccurrence.startTime,
    duration: 0,
    capacity: 0,
    booked: 0,
    location: b.classOccurrence.location,
  };
}

/** The caller's own class bookings, enriched with each booking's full occurrence (trainer, category, capacity — not carried on the booking response itself) and waitlist position — the real-data replacement for BookingsProvider's mock `myClassBookings`. Bounded by how many classes one member has booked, not the whole gym's booking volume. */
export function useOwnClassBookings() {
  const { status } = useAuth();
  const query = useQuery({
    queryKey: ["class-bookings", "me"],
    queryFn: async (): Promise<MemberClassBookingView[]> => {
      const page = await classBookingsApi.fetchOwnClassBookings({ limit: 100 });
      const bookings = page.items;

      const occurrenceIds = [...new Set(bookings.map((b) => b.classOccurrence.id))];
      const occurrences = await Promise.all(
        occurrenceIds.map((id) => classesApi.fetchClassOccurrence(id).catch(() => null))
      );
      const occurrenceById = new Map(occurrences.filter((o) => o !== null).map((o) => [o.id, o]));

      const waitlistedOccurrenceIds = [
        ...new Set(bookings.filter((b) => b.status === "WAITLISTED").map((b) => b.classOccurrence.id)),
      ];
      const waitlists = await Promise.all(
        waitlistedOccurrenceIds.map((id) => classBookingsApi.fetchClassWaitlist(id).catch(() => []))
      );
      const waitlistByOccurrence = new Map(waitlistedOccurrenceIds.map((id, i) => [id, waitlists[i]!]));

      return bookings.map((b) => {
        const occurrence = occurrenceById.get(b.classOccurrence.id);
        const gymClass = occurrence ? toLegacyClassFromOccurrence(occurrence) : fallbackClassFromSummary(b);
        const waitlist = waitlistByOccurrence.get(b.classOccurrence.id) ?? [];
        const position = waitlist.findIndex((w) => w.id === b.id);
        return {
          booking: toLegacyClassBooking(b),
          gymClass,
          occurrenceDate: b.classOccurrence.date.slice(0, 10),
          waitlistPosition: b.status === "WAITLISTED" && position !== -1 ? position + 1 : null,
        };
      });
    },
    enabled: status === "authenticated",
    staleTime: 15_000,
  });

  return { bookings: query.data ?? [], isLoading: query.isLoading, isError: query.isError };
}

export function useBookClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (classOccurrenceId: string) => classBookingsApi.bookClassAsSelf(classOccurrenceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
  });
}

export function useCancelOwnClassBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => classBookingsApi.cancelOwnClassBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
  });
}

export function useBookClassForMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: classBookingsApi.BookClassForMemberInput) => classBookingsApi.bookClassForMember(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
  });
}

export function useCancelClassBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => classBookingsApi.cancelClassBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
  });
}

export function usePromoteClassBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => classBookingsApi.promoteClassBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
  });
}

export function useMarkClassAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: classBookingsApi.ClassAttendanceStatus }) =>
      classBookingsApi.markClassAttendance(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-bookings"] });
    },
  });
}
