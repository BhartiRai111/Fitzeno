"use client";

import { useQuery } from "@tanstack/react-query";
import * as financeApi from "@/lib/api/finance";
import { useAuth } from "@/lib/auth/auth-context";
import { toLegacyExpense } from "@/hooks/use-expenses";
import type { PeriodPreset, DateRange } from "@/lib/reports-helpers";

const CATEGORY_LABEL: Record<string, string> = {
  RENT: "Rent",
  SALARIES: "Salaries",
  UTILITIES: "Utilities",
  MARKETING: "Marketing",
  SOFTWARE: "Software",
  MAINTENANCE: "Maintenance",
  CLEANING: "Cleaning",
  EQUIPMENT: "Equipment",
  SUPPLIES: "Supplies",
  OTHER: "Other",
};

function categoryLabel(category: string): string {
  return CATEGORY_LABEL[category] ?? category;
}

/** The Financial Overview tab's one data source — revenue, expenses, and net result for a period, straight from the backend's own aggregates (no client-side P&L math over raw rows). */
export function useFinanceOverview(preset: PeriodPreset, customRange?: DateRange) {
  const { status } = useAuth();
  const query = useQuery({
    queryKey: ["finance", "overview", preset, customRange],
    queryFn: () =>
      financeApi.fetchFinanceOverview({
        preset,
        from: preset === "custom" ? customRange?.start : undefined,
        to: preset === "custom" ? customRange?.end : undefined,
      }),
    enabled: status === "authenticated" && (preset !== "custom" || !!customRange),
    staleTime: 30_000,
  });

  const data = query.data;

  return {
    data: data
      ? {
          ...data,
          expensesByCategory: data.expensesByCategory.map((c) => ({ ...c, category: categoryLabel(c.category) })),
          unusualCategoryIncreases: data.unusualCategoryIncreases.map((c) => ({ ...c, category: categoryLabel(c.category) })),
          recentExpenses: data.recentExpenses.map(toLegacyExpense),
        }
      : undefined,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

export function useFinanceTrend(months = 6) {
  const { status } = useAuth();
  const query = useQuery({
    queryKey: ["finance", "trend", months],
    queryFn: () => financeApi.fetchFinanceTrend(months),
    enabled: status === "authenticated",
    staleTime: 60_000,
  });

  return { points: query.data ?? [], isLoading: query.isLoading };
}
