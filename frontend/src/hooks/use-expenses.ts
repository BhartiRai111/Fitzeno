"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as expensesApi from "@/lib/api/expenses";
import { useAuth } from "@/lib/auth/auth-context";
import type { Expense, ExpenseCategory, ExpenseFrequency, ExpenseStatus } from "@/lib/data/types";

const CATEGORY_TO_LEGACY: Record<expensesApi.BackendExpenseCategory, ExpenseCategory> = {
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

const CATEGORY_TO_BACKEND: Record<ExpenseCategory, expensesApi.BackendExpenseCategory> = {
  Rent: "RENT",
  Salaries: "SALARIES",
  Utilities: "UTILITIES",
  Marketing: "MARKETING",
  Software: "SOFTWARE",
  Maintenance: "MAINTENANCE",
  Cleaning: "CLEANING",
  Equipment: "EQUIPMENT",
  Supplies: "SUPPLIES",
  Other: "OTHER",
};

const FREQUENCY_TO_LEGACY: Record<expensesApi.BackendExpenseFrequency, ExpenseFrequency> = {
  ONE_TIME: "one-time",
  MONTHLY: "monthly",
  QUARTERLY: "quarterly",
  YEARLY: "yearly",
};

const FREQUENCY_TO_BACKEND: Record<ExpenseFrequency, expensesApi.BackendExpenseFrequency> = {
  "one-time": "ONE_TIME",
  monthly: "MONTHLY",
  quarterly: "QUARTERLY",
  yearly: "YEARLY",
};

const STATUS_TO_LEGACY: Record<expensesApi.BackendExpenseStatus, ExpenseStatus> = {
  PENDING: "pending",
  PAID: "paid",
  CANCELLED: "cancelled",
};

const STATUS_TO_BACKEND: Record<ExpenseStatus, expensesApi.BackendExpenseStatus> = {
  pending: "PENDING",
  paid: "PAID",
  cancelled: "CANCELLED",
};

type LegacyMethod = "Card" | "Bank Transfer" | "Cash" | "UPI";

const METHOD_TO_LEGACY: Record<expensesApi.BackendExpenseMethod, LegacyMethod> = {
  CASH: "Cash",
  CARD: "Card",
  UPI: "UPI",
  BANK_TRANSFER: "Bank Transfer",
  ONLINE: "Card",
  OTHER: "Cash",
};

const METHOD_TO_BACKEND: Record<LegacyMethod, expensesApi.BackendExpenseMethod> = {
  Card: "CARD",
  "Bank Transfer": "BANK_TRANSFER",
  Cash: "CASH",
  UPI: "UPI",
};

export function toLegacyExpense(e: expensesApi.BackendExpense): Expense {
  return {
    id: e.id,
    reference: e.reference,
    title: e.title,
    category: CATEGORY_TO_LEGACY[e.category],
    amount: e.amount,
    date: e.date.slice(0, 10),
    dueDate: e.dueDate ? e.dueDate.slice(0, 10) : undefined,
    status: STATUS_TO_LEGACY[e.status],
    recurring: e.recurring,
    frequency: FREQUENCY_TO_LEGACY[e.frequency],
    paymentMethod: METHOD_TO_LEGACY[e.method],
    vendor: e.vendor ?? undefined,
    notes: e.notes ?? undefined,
    recordedBy: e.recordedByUser ? `${e.recordedByUser.firstName} ${e.recordedByUser.lastName}` : "Unknown",
  };
}

export function toBackendExpenseInput(input: {
  title: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  dueDate?: string;
  status: ExpenseStatus;
  frequency: ExpenseFrequency;
  paymentMethod: LegacyMethod;
  vendor?: string;
  notes?: string;
}): expensesApi.CreateExpenseInput {
  return {
    title: input.title,
    category: CATEGORY_TO_BACKEND[input.category],
    amount: input.amount,
    date: input.date,
    dueDate: input.dueDate,
    status: STATUS_TO_BACKEND[input.status],
    frequency: FREQUENCY_TO_BACKEND[input.frequency],
    method: METHOD_TO_BACKEND[input.paymentMethod],
    vendor: input.vendor,
    notes: input.notes,
  };
}

/** The gym's full expense ledger — the real-data replacement for lib/data/expenses.ts. */
export function useExpensesRoster() {
  const { status } = useAuth();
  const query = useQuery({
    queryKey: ["expenses", "roster"],
    queryFn: () => expensesApi.fetchExpenses({ limit: 200 }),
    enabled: status === "authenticated",
    staleTime: 30_000,
  });

  return {
    expenses: (query.data?.items ?? []).map(toLegacyExpense),
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: expensesApi.CreateExpenseInput) => expensesApi.createExpense(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["finance"] });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: expensesApi.UpdateExpenseInput }) => expensesApi.updateExpense(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["finance"] });
    },
  });
}

export function useMarkExpensePaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => expensesApi.markExpensePaid(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["finance"] });
    },
  });
}

export function useCancelExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => expensesApi.cancelExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["finance"] });
    },
  });
}

export function useReopenExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => expensesApi.reopenExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["finance"] });
    },
  });
}
