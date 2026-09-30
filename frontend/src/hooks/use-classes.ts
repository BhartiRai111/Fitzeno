"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as classesApi from "@/lib/api/classes";
import { useAuth } from "@/lib/auth/auth-context";
import { dayFromDate, toMinutes } from "@/lib/booking-helpers";
import type { GymClass } from "@/lib/data/types";

const DAY_TO_BACKEND: Record<GymClass["day"], classesApi.DayOfWeek> = {
  Sun: "SUN",
  Mon: "MON",
  Tue: "TUE",
  Wed: "WED",
  Thu: "THU",
  Fri: "FRI",
  Sat: "SAT",
};

const DAY_TO_LEGACY: Record<classesApi.DayOfWeek, GymClass["day"]> = {
  SUN: "Sun",
  MON: "Mon",
  TUE: "Tue",
  WED: "Wed",
  THU: "Thu",
  FRI: "Fri",
  SAT: "Sat",
};

/** Adapts a bookable, dated session into the existing `GymClass` shape — the real-data replacement for lib/data/classes.ts wherever members/staff browse the timetable. */
export function toLegacyClassFromOccurrence(o: classesApi.BackendClassOccurrence): GymClass {
  const date = o.date.slice(0, 10);
  return {
    id: o.id,
    name: o.name,
    type: o.category,
    trainerId: o.trainer.id,
    day: dayFromDate(date),
    date,
    startTime: o.startTime,
    duration: toMinutes(o.endTime) - toMinutes(o.startTime),
    capacity: o.capacity,
    booked: o.confirmedCount,
    location: o.location,
  };
}

/** Adapts a recurring class template into the same `GymClass` shape — used only by the owner's series editor (`ClassDialog`/the Classes table), which edits the template, not a dated session. `booked` is meaningless for a template and left at 0 (unused by the editor). */
export function toLegacyClassFromSeries(s: classesApi.BackendClassSeries): GymClass {
  return {
    id: s.id,
    name: s.name,
    type: s.category,
    trainerId: s.trainer.id,
    day: DAY_TO_LEGACY[s.dayOfWeek],
    startTime: s.startTime,
    duration: s.durationMinutes,
    capacity: s.capacity,
    booked: 0,
    location: s.location,
  };
}

export function useClassOccurrences(params?: classesApi.ListClassOccurrencesParams) {
  const { status } = useAuth();
  const query = useQuery({
    queryKey: ["classes", "occurrences", params],
    queryFn: () => classesApi.fetchClassOccurrences({ limit: 200, ...params }),
    enabled: status === "authenticated",
    staleTime: 15_000,
  });

  return {
    occurrences: query.data?.items ?? [],
    classes: (query.data?.items ?? []).map(toLegacyClassFromOccurrence),
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

export function useClassSeriesRoster(params?: classesApi.ListClassSeriesParams) {
  const { status } = useAuth();
  const query = useQuery({
    queryKey: ["classes", "series", params],
    queryFn: () => classesApi.fetchClassSeries({ limit: 200, ...params }),
    enabled: status === "authenticated",
    staleTime: 30_000,
  });

  return {
    series: query.data?.items ?? [],
    classes: (query.data?.items ?? []).map(toLegacyClassFromSeries),
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

export interface CreateClassInput {
  name: string;
  type: string;
  trainerId: string;
  day: GymClass["day"];
  startTime: string;
  duration: number;
  capacity: number;
  location: string;
}

function toBackendSeriesInput(input: CreateClassInput): classesApi.CreateClassSeriesInput {
  return {
    name: input.name,
    category: input.type,
    trainerId: input.trainerId,
    dayOfWeek: DAY_TO_BACKEND[input.day],
    startTime: input.startTime,
    durationMinutes: input.duration,
    capacity: input.capacity,
    location: input.location,
  };
}

export function useCreateClassSeries() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateClassInput) => classesApi.createClassSeries(toBackendSeriesInput(input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
  });
}

export function useUpdateClassSeries() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CreateClassInput }) =>
      classesApi.updateClassSeries(id, toBackendSeriesInput(input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
  });
}

export function useCancelClassSeries() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => classesApi.cancelClassSeries(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
  });
}
