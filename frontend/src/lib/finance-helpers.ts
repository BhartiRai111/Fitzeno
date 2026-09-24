import { TODAY, type DateRange } from "@/lib/reports-helpers";
import { daysBetween } from "@/lib/utils-data";
import type { Expense, ExpenseCategory } from "@/lib/data/types";

export { TODAY };

const MONTH_TO_NUM: Record<string, string> = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06", Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" };

function daysInCalendarMonth(monthNum: string, year = 2026): number {
  return new Date(year, Number(monthNum), 0).getDate();
}

/**
 * Prorates a whole-business monthly series (e.g. `revenueByMonth`) over an
 * arbitrary date range. The series is on a much larger scale than any
 * granular per-transaction sample, so this keeps period-filtered P&L figures
 * internally consistent — the current month's entry is treated as covering
 * only up to `today` (a running total), not a full calendar month.
 */
export function prorateMonthlyTotal(series: { month: string; [key: string]: string | number }[], valueKey: string, range: DateRange, today: string = TODAY): number {
  const currentMonthPrefix = today.slice(0, 7);
  let total = 0;
  for (const entry of series) {
    const num = MONTH_TO_NUM[entry.month];
    if (!num) continue;
    const value = Number(entry[valueKey]) || 0;
    const monthStart = `2026-${num}-01`;
    const isCurrent = `2026-${num}` === currentMonthPrefix;
    const monthEnd = isCurrent ? today : `2026-${num}-${String(daysInCalendarMonth(num)).padStart(2, "0")}`;
    const coverageDays = daysBetween(monthStart, monthEnd) + 1;
    if (coverageDays <= 0) continue;
    const overlapStart = range.start > monthStart ? range.start : monthStart;
    const overlapEnd = range.end < monthEnd ? range.end : monthEnd;
    if (overlapStart > overlapEnd) continue;
    const overlapDays = daysBetween(overlapStart, overlapEnd) + 1;
    total += value * (overlapDays / coverageDays);
  }
  return Math.round(total);
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "Rent",
  "Salaries",
  "Utilities",
  "Marketing",
  "Software",
  "Maintenance",
  "Cleaning",
  "Equipment",
  "Supplies",
  "Other",
];

function inRange(dateISO: string, range: DateRange): boolean {
  return dateISO >= range.start && dateISO <= range.end;
}

// ---------------------------------------------------------------------------
// Ledger filters
// ---------------------------------------------------------------------------

export function getExpensesInRange(expenses: Expense[], range: DateRange): Expense[] {
  return expenses.filter((e) => inRange(e.date, range));
}

export function getPaidExpensesInRange(expenses: Expense[], range: DateRange): Expense[] {
  return getExpensesInRange(expenses, range).filter((e) => e.status === "paid");
}

export function getPendingExpenses(expenses: Expense[]): Expense[] {
  return expenses.filter((e) => e.status === "pending");
}

export function getTotalExpensesInRange(expenses: Expense[], range: DateRange): number {
  return getPaidExpensesInRange(expenses, range).reduce((sum, e) => sum + e.amount, 0);
}

export function getPendingAmountInRange(expenses: Expense[], range: DateRange): number {
  return getExpensesInRange(expenses, range)
    .filter((e) => e.status === "pending")
    .reduce((sum, e) => sum + e.amount, 0);
}

// ---------------------------------------------------------------------------
// Breakdown / composition
// ---------------------------------------------------------------------------

export interface ExpenseCategoryTotal {
  category: ExpenseCategory;
  amount: number;
  share: number;
}

export function getExpensesByCategoryInRange(expenses: Expense[], range: DateRange): ExpenseCategoryTotal[] {
  const paid = getPaidExpensesInRange(expenses, range);
  const total = paid.reduce((sum, e) => sum + e.amount, 0);
  const byCategory = new Map<ExpenseCategory, number>();
  for (const e of paid) byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
  return [...byCategory.entries()]
    .map(([category, amount]) => ({ category, amount, share: total > 0 ? Math.round((amount / total) * 100) : 0 }))
    .sort((a, b) => b.amount - a.amount);
}

export interface RecurringSplit {
  recurring: number;
  oneTime: number;
}

export function getRecurringVsOneTime(expenses: Expense[], range: DateRange): RecurringSplit {
  const paid = getPaidExpensesInRange(expenses, range);
  return {
    recurring: paid.filter((e) => e.recurring).reduce((sum, e) => sum + e.amount, 0),
    oneTime: paid.filter((e) => !e.recurring).reduce((sum, e) => sum + e.amount, 0),
  };
}

// ---------------------------------------------------------------------------
// Profitability
// ---------------------------------------------------------------------------

export function getNetProfit(revenue: number, totalExpenses: number): number {
  return revenue - totalExpenses;
}

/** Net profit as a % of revenue. Returns 0 when there's no revenue to measure against. */
export function getProfitMargin(revenue: number, totalExpenses: number): number {
  if (revenue <= 0) return 0;
  return Math.round(((revenue - totalExpenses) / revenue) * 100);
}

// ---------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------

export interface CategoryChange {
  category: ExpenseCategory;
  amount: number;
  previousAmount: number;
  changePercent: number;
}

/**
 * Flags categories whose paid spend rose sharply vs. the comparison period.
 * Only compares against a real prior baseline — a category with no spend in
 * the comparison period is "new," not "increased," so it's left out rather
 * than reported as a misleading +100%.
 */
export function getUnusualIncreases(
  expenses: Expense[],
  range: DateRange,
  comparisonRange: DateRange,
  thresholdPercent = 25,
  minAmount = 50
): CategoryChange[] {
  const current = getExpensesByCategoryInRange(expenses, range);
  const previous = getExpensesByCategoryInRange(expenses, comparisonRange);
  const prevMap = new Map(previous.map((c) => [c.category, c.amount]));

  return current
    .filter((c) => c.amount >= minAmount)
    .map((c) => {
      const previousAmount = prevMap.get(c.category) ?? 0;
      const changePercent = previousAmount > 0 ? Math.round(((c.amount - previousAmount) / previousAmount) * 100) : 0;
      return { category: c.category, amount: c.amount, previousAmount, changePercent };
    })
    .filter((c) => c.previousAmount > 0 && c.changePercent >= thresholdPercent)
    .sort((a, b) => b.changePercent - a.changePercent);
}

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

export function generateExpenseReference(existing: Expense[]): string {
  const highest = existing.reduce((max, e) => {
    const n = Number(e.reference.replace("EXP-", ""));
    return Number.isFinite(n) ? Math.max(max, n) : max;
  }, 2032);
  return `EXP-${highest + 1}`;
}

export function isDueSoon(expense: Expense, today: string = TODAY, withinDays = 7): boolean {
  if (expense.status !== "pending" || !expense.dueDate) return false;
  const due = new Date(`${expense.dueDate}T00:00:00`).getTime();
  const now = new Date(`${today}T00:00:00`).getTime();
  const days = Math.round((due - now) / (1000 * 60 * 60 * 24));
  return days >= 0 && days <= withinDays;
}

export function isOverdue(expense: Expense, today: string = TODAY): boolean {
  if (expense.status !== "pending" || !expense.dueDate) return false;
  return expense.dueDate < today;
}
