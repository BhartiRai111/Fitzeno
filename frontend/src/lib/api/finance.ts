import { apiFetch, toQueryString } from "./client";
import type { BackendExpense, BackendExpenseCategory } from "./expenses";

export type FinancePeriodPreset = "today" | "week" | "month" | "last-month" | "custom";

export interface FinanceDateRange {
  start: string;
  end: string;
}

export interface FinancePeriod {
  preset: FinancePeriodPreset;
  range: FinanceDateRange;
  comparisonRange: FinanceDateRange;
}

export interface FinanceExpenseCategoryTotal {
  category: BackendExpenseCategory;
  amount: number;
  share: number;
}

export interface FinanceRecurringSplit {
  recurring: number;
  oneTime: number;
}

export interface FinanceCategoryChange {
  category: BackendExpenseCategory;
  amount: number;
  previousAmount: number;
  changePercent: number;
}

export interface FinancePendingExpenseInsights {
  pendingAmount: number;
  pendingCount: number;
  overdueAmount: number;
  overdueCount: number;
  dueSoonAmount: number;
  dueSoonCount: number;
}

export interface FinanceOverview {
  period: FinancePeriod;
  grossRevenue: number;
  refunds: number;
  netRevenue: number;
  previousNetRevenue: number;
  totalExpenses: number;
  previousTotalExpenses: number;
  netResult: number;
  previousNetResult: number;
  profitMargin: number;
  revenueByType: { type: string; amount: number }[];
  expensesByCategory: FinanceExpenseCategoryTotal[];
  recurringVsOneTime: FinanceRecurringSplit;
  unusualCategoryIncreases: FinanceCategoryChange[];
  pendingExpenses: FinancePendingExpenseInsights;
  recentExpenses: BackendExpense[];
}

export interface FetchFinanceOverviewParams {
  preset?: FinancePeriodPreset;
  from?: string;
  to?: string;
}

export async function fetchFinanceOverview(params?: FetchFinanceOverviewParams): Promise<FinanceOverview> {
  return apiFetch<FinanceOverview>(`/finance/overview${toQueryString(params)}`);
}

export interface FinanceTrendPoint {
  month: string;
  revenue: number;
  expenses: number;
  net: number;
}

export async function fetchFinanceTrend(months?: number): Promise<FinanceTrendPoint[]> {
  return apiFetch<FinanceTrendPoint[]>(`/finance/trend${toQueryString({ months })}`);
}
