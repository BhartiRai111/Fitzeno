"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as txApi from "@/lib/api/transactions";
import { useAuth } from "@/lib/auth/auth-context";
import type { Payment, PaymentStatus, RevenueCategory } from "@/lib/data/types";

const CATEGORY_MAP: Record<txApi.TransactionType, RevenueCategory> = {
  MEMBERSHIP_PURCHASE: "Membership",
  MEMBERSHIP_RENEWAL: "Membership",
  PERSONAL_TRAINING: "Personal Training",
  CLASS_SESSION: "Classes",
  STORE_SALE: "Retail",
  OTHER: "Other",
};

const METHOD_MAP: Record<txApi.BackendPaymentMethod, Payment["method"]> = {
  CASH: "Cash",
  CARD: "Card",
  UPI: "UPI",
  BANK_TRANSFER: "Bank Transfer",
  ONLINE: "Online",
  OTHER: "Other",
};

const STATUS_MAP: Record<txApi.TransactionStatus, PaymentStatus> = {
  PAID: "paid",
  PENDING: "pending",
  PROCESSING: "pending",
  FAILED: "failed",
  CANCELLED: "cancelled",
  PARTIALLY_REFUNDED: "refunded",
  REFUNDED: "refunded",
};

function toInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function toLegacyPayment(t: txApi.BackendTransaction): Payment {
  return {
    id: t.id,
    memberName: `${t.member.firstName} ${t.member.lastName}`,
    memberInitials: toInitials(t.member.firstName, t.member.lastName),
    amount: t.amount,
    method: METHOD_MAP[t.method],
    status: STATUS_MAP[t.status],
    plan: t.description,
    category: CATEGORY_MAP[t.type],
    date: t.paidAt ?? t.createdAt,
    invoiceId: t.invoiceNumber ?? t.id,
  };
}

export function useTransactionsRoster(params?: txApi.ListTransactionsParams, options?: { enabled?: boolean }) {
  const { status } = useAuth();
  const query = useQuery({
    queryKey: ["transactions", "roster", params],
    queryFn: () => txApi.fetchTransactions({ limit: 100, ...params }),
    enabled: status === "authenticated" && (options?.enabled ?? true),
    staleTime: 30_000,
  });

  return {
    payments: (query.data?.items ?? []).map(toLegacyPayment),
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

export function useOwnTransactions(params?: txApi.ListTransactionsParams) {
  const { status } = useAuth();
  const query = useQuery({
    queryKey: ["transactions", "own", params],
    queryFn: () => txApi.fetchOwnTransactions({ limit: 50, ...params }),
    enabled: status === "authenticated",
    staleTime: 30_000,
  });

  return {
    payments: (query.data?.items ?? []).map(toLegacyPayment),
    isLoading: query.isLoading,
  };
}

/** A cheap "how many match this filter" count — reads PaginationMeta.totalItems from a limit:1 fetch rather than pulling every row. */
export function useTransactionCount(params?: txApi.ListTransactionsParams) {
  const { status } = useAuth();
  const query = useQuery({
    queryKey: ["transactions", "count", params],
    queryFn: () => txApi.fetchTransactions({ ...params, limit: 1 }),
    enabled: status === "authenticated",
    staleTime: 30_000,
    select: (result) => result.meta.totalItems,
  });
  return query.data ?? 0;
}

export function useTransactionStats(dateFrom?: string, dateTo?: string) {
  const { status } = useAuth();
  return useQuery({
    queryKey: ["transactions", "stats", dateFrom, dateTo],
    queryFn: () => txApi.fetchTransactionStats(dateFrom, dateTo),
    enabled: status === "authenticated",
    staleTime: 30_000,
  });
}

export function useRecordTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: txApi.CreateTransactionInput) => txApi.recordTransaction(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useRefundTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount, reason }: { id: string; amount?: number; reason?: string }) =>
      txApi.refundTransaction(id, amount, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useMarkTransactionPaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => txApi.markTransactionPaid(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["transactions"] }),
  });
}

export function useMarkTransactionFailed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => txApi.markTransactionFailed(id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["transactions"] }),
  });
}

export function useCancelTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => txApi.cancelTransaction(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["transactions"] }),
  });
}
