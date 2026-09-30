import { apiFetch, apiFetchPaginated, toQueryString } from "./client";
import type { PaginationParams, Paginated } from "./types";

export type BackendExpenseCategory = "RENT" | "SALARIES" | "UTILITIES" | "MARKETING" | "SOFTWARE" | "MAINTENANCE" | "CLEANING" | "EQUIPMENT" | "SUPPLIES" | "OTHER";
export type BackendExpenseFrequency = "ONE_TIME" | "MONTHLY" | "QUARTERLY" | "YEARLY";
export type BackendExpenseStatus = "PENDING" | "PAID" | "CANCELLED";
export type BackendExpenseMethod = "CASH" | "CARD" | "UPI" | "BANK_TRANSFER" | "ONLINE" | "OTHER";

interface ExpenseRecordedBySummary {
  id: string;
  firstName: string;
  lastName: string;
}

export interface BackendExpense {
  id: string;
  tenantId: string;
  reference: string;
  title: string;
  category: BackendExpenseCategory;
  amount: number;
  currency: string;
  frequency: BackendExpenseFrequency;
  recurring: boolean;
  status: BackendExpenseStatus;
  method: BackendExpenseMethod;
  vendor: string | null;
  notes: string | null;
  date: string;
  dueDate: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  recordedByUser: ExpenseRecordedBySummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListExpensesParams extends PaginationParams {
  category?: BackendExpenseCategory;
  status?: BackendExpenseStatus;
  frequency?: BackendExpenseFrequency;
  recurring?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

export async function fetchExpenses(params?: ListExpensesParams): Promise<Paginated<BackendExpense>> {
  return apiFetchPaginated<BackendExpense>(`/expenses${toQueryString(params)}`);
}

export async function fetchExpense(id: string): Promise<BackendExpense> {
  return apiFetch<BackendExpense>(`/expenses/${id}`);
}

export interface CreateExpenseInput {
  title: string;
  category: BackendExpenseCategory;
  amount: number;
  date: string;
  dueDate?: string;
  status?: BackendExpenseStatus;
  frequency?: BackendExpenseFrequency;
  method: BackendExpenseMethod;
  vendor?: string;
  notes?: string;
}

export async function createExpense(input: CreateExpenseInput): Promise<BackendExpense> {
  return apiFetch<BackendExpense>("/expenses", { method: "POST", body: input });
}

export type UpdateExpenseInput = Partial<CreateExpenseInput>;

export async function updateExpense(id: string, input: UpdateExpenseInput): Promise<BackendExpense> {
  return apiFetch<BackendExpense>(`/expenses/${id}`, { method: "PATCH", body: input });
}

export async function markExpensePaid(id: string): Promise<BackendExpense> {
  return apiFetch<BackendExpense>(`/expenses/${id}/mark-paid`, { method: "POST" });
}

export async function cancelExpense(id: string): Promise<BackendExpense> {
  return apiFetch<BackendExpense>(`/expenses/${id}/cancel`, { method: "POST" });
}

export async function reopenExpense(id: string): Promise<BackendExpense> {
  return apiFetch<BackendExpense>(`/expenses/${id}/reopen`, { method: "POST" });
}
