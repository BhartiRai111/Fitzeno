"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as plansApi from "@/lib/api/membership-plans";
import { useAuth } from "@/lib/auth/auth-context";
import type { MembershipPlan } from "@/lib/data/types";

function toLegacyPlan(p: plansApi.BackendMembershipPlan): MembershipPlan {
  return {
    id: p.id,
    name: p.name,
    price: p.price,
    billingPeriod: p.billingPeriod === "YEAR" ? "year" : "month",
    description: p.description ?? "",
    perks: p.perks,
  };
}

/** Active, sellable membership plans — the real-data replacement for lib/data/plans.ts wherever staff assign or a member purchases a plan. */
export function useMembershipPlans() {
  const { status } = useAuth();
  const query = useQuery({
    queryKey: ["membership-plans", "active"],
    queryFn: () => plansApi.fetchMembershipPlans({ status: "ACTIVE", limit: 100 }),
    enabled: status === "authenticated",
    staleTime: 60_000,
  });

  return {
    plans: (query.data?.items ?? []).map(toLegacyPlan),
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

export function useCreateMembershipPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: plansApi.CreateMembershipPlanInput) => plansApi.createMembershipPlan(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membership-plans"] });
    },
  });
}

export function useUpdateMembershipPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<plansApi.CreateMembershipPlanInput> }) =>
      plansApi.updateMembershipPlan(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membership-plans"] });
    },
  });
}

export function useArchiveMembershipPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => plansApi.archiveMembershipPlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membership-plans"] });
    },
  });
}
