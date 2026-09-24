import { apiFetch, apiFetchPaginated, toQueryString } from "./client";
import type { PaginationParams, Paginated } from "./types";

export type TransactionType = "MEMBERSHIP_PURCHASE" | "MEMBERSHIP_RENEWAL" | "PERSONAL_TRAINING" | "CLASS_SESSION" | "STORE_SALE" | "OTHER";
export type BackendPaymentMethod = "CASH" | "CARD" | "UPI" | "BANK_TRANSFER" | "ONLINE" | "OTHER";
export type TransactionStatus = "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "CANCELLED" | "PARTIALLY_REFUNDED" | "REFUNDED";

interface TransactionMemberSummary {
  id: string;
  firstName: string;
  lastName: string;
}

interface TransactionUserSummary {
  id: string;
  firstName: string;
  lastName: string;
}

export interface BackendTransaction {
  id: string;
  tenantId: string;
  member: TransactionMemberSummary;
  type: TransactionType;
  description: string;
  amount: number;
  currency: string;
  method: BackendPaymentMethod;
  status: TransactionStatus;
  failureReason: string | null;
  relatedMembershipId: string | null;
  relatedPtSessionId: string | null;
  relatedClassBookingId: string | null;
  recordedByUser: TransactionUserSummary | null;
  invoiceNumber: string | null;
  refundedAmount: number;
  paidAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListTransactionsParams extends PaginationParams {
  memberId?: string;
  status?: TransactionStatus;
  type?: TransactionType;
  method?: BackendPaymentMethod;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
}

export async function fetchTransactions(params?: ListTransactionsParams): Promise<Paginated<BackendTransaction>> {
  return apiFetchPaginated<BackendTransaction>(`/transactions${toQueryString(params)}`);
}

export async function fetchOwnTransactions(params?: ListTransactionsParams): Promise<Paginated<BackendTransaction>> {
  return apiFetchPaginated<BackendTransaction>(`/transactions/me${toQueryString(params)}`);
}

export interface TransactionStats {
  totalRevenue: number;
  paidCount: number;
  pendingAmount: number;
  failedCount: number;
  refundedAmount: number;
  revenueByType: { type: TransactionType; amount: number }[];
  revenueByMethod: { method: BackendPaymentMethod; amount: number }[];
}

export async function fetchTransactionStats(dateFrom?: string, dateTo?: string): Promise<TransactionStats> {
  return apiFetch<TransactionStats>(`/transactions/stats${toQueryString({ dateFrom, dateTo })}`);
}

export interface CreateTransactionInput {
  memberId: string;
  type: TransactionType;
  description: string;
  amount: number;
  method: BackendPaymentMethod;
  relatedMembershipId?: string;
  idempotencyKey?: string;
}

export async function recordTransaction(input: CreateTransactionInput): Promise<BackendTransaction> {
  return apiFetch<BackendTransaction>("/transactions", { method: "POST", body: input });
}

export async function markTransactionPaid(id: string): Promise<BackendTransaction> {
  return apiFetch<BackendTransaction>(`/transactions/${id}/mark-paid`, { method: "POST" });
}

export async function markTransactionFailed(id: string, reason?: string): Promise<BackendTransaction> {
  return apiFetch<BackendTransaction>(`/transactions/${id}/mark-failed`, { method: "POST", body: { reason } });
}

export async function cancelTransaction(id: string): Promise<BackendTransaction> {
  return apiFetch<BackendTransaction>(`/transactions/${id}/cancel`, { method: "POST" });
}

export async function refundTransaction(id: string, amount?: number, reason?: string): Promise<BackendTransaction> {
  return apiFetch<BackendTransaction>(`/transactions/${id}/refund`, { method: "POST", body: { amount, reason } });
}
