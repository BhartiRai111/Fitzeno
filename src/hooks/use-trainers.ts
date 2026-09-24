"use client";

import { useQuery } from "@tanstack/react-query";
import * as trainersApi from "@/lib/api/trainers";
import { useAuth } from "@/lib/auth/auth-context";
import type { Trainer } from "@/lib/data/types";

function toInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

const COLORS: Trainer["color"][] = ["indigo", "lime", "amber", "sky"];

/**
 * Adapts a backend trainer into the existing `Trainer` shape. Note
 * `trainer.id` here is the User id (what Member.trainerId and
 * ClassOccurrence.trainerId reference), not the TrainerResponseDto's own
 * profile-row id — see CreateMemberDto's own comment ("must reference a
 * TRAINER in this gym"). Rating/review count aren't backend-tracked
 * (no reviews module) — omitted rather than invented.
 */
function toLegacyTrainer(t: trainersApi.BackendTrainer, index: number): Trainer {
  return {
    id: t.userId,
    name: `${t.user.firstName} ${t.user.lastName}`,
    initials: toInitials(t.user.firstName, t.user.lastName),
    role: t.offersPersonalTraining ? "Personal Trainer" : "Group Coach",
    specialties: t.specialties,
    bio: t.bio ?? "",
    rating: 0,
    reviewCount: 0,
    yearsExperience: t.yearsExperience ?? 0,
    color: COLORS[index % COLORS.length],
    email: t.user.email ?? undefined,
    phone: t.user.phone ?? undefined,
    joinedOn: t.createdAt,
    status: t.status === "ACTIVE" ? "active" : "inactive",
  };
}

export function useTrainersRoster() {
  const { status } = useAuth();
  const query = useQuery({
    queryKey: ["trainers", "roster"],
    queryFn: () => trainersApi.fetchTrainers({ limit: 100 }),
    enabled: status === "authenticated",
    staleTime: 60_000,
  });

  return {
    trainers: (query.data?.items ?? []).map(toLegacyTrainer),
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
