import { BadRequestException, Injectable } from '@nestjs/common';
import { TransactionsService } from '../payments/transactions.service.js';
import { ExpensesService } from '../expenses/expenses.service.js';
import type { FinanceOverviewQueryDto, FinancePeriodPreset } from './dto/finance-overview-query.dto.js';
import type { FinanceOverviewResponseDto } from './dto/finance-overview-response.dto.js';

interface DateRange {
  start: string;
  end: string;
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toUtcMidnight(dateIso: string): Date {
  return new Date(`${dateIso}T00:00:00.000Z`);
}

function addDaysIso(dateIso: string, days: number): string {
  const d = toUtcMidnight(dateIso);
  d.setUTCDate(d.getUTCDate() + days);
  return toIso(d);
}

function addMonthsIso(dateIso: string, months: number): string {
  const d = toUtcMidnight(dateIso);
  d.setUTCMonth(d.getUTCMonth() + months);
  return toIso(d);
}

function startOfWeekIso(dateIso: string): string {
  const d = toUtcMidnight(dateIso);
  const diff = (d.getUTCDay() + 6) % 7; // days since Monday
  d.setUTCDate(d.getUTCDate() - diff);
  return toIso(d);
}

function startOfMonthIso(dateIso: string): string {
  return `${dateIso.slice(0, 7)}-01`;
}

function endOfMonthIso(dateIso: string): string {
  const d = toUtcMidnight(startOfMonthIso(dateIso));
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(d.getUTCDate() - 1);
  return toIso(d);
}

function daysBetween(fromIso: string, toIsoDate: string): number {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.round((toUtcMidnight(toIsoDate).getTime() - toUtcMidnight(fromIso).getTime()) / MS_PER_DAY);
}

/**
 * Ports the approved frontend's own `getPresetRange`/`getComparisonRange`
 * (reports-helpers.ts) date-window logic to the backend verbatim, so a
 * given preset always resolves to the exact same range/comparison-range
 * the frontend would compute itself — the "date/filter functionality the
 * existing UI actually needs," not a superset (no quarter/year presets:
 * the approved frontend's own `PeriodPreset` type doesn't have them).
 */
function getPresetRange(preset: Exclude<FinancePeriodPreset, 'custom'>, today: string): DateRange {
  switch (preset) {
    case 'today':
      return { start: today, end: today };
    case 'week':
      return { start: startOfWeekIso(today), end: today };
    case 'month':
      return { start: startOfMonthIso(today), end: today };
    case 'last-month': {
      const prevMonthAnchor = addMonthsIso(startOfMonthIso(today), -1);
      return { start: startOfMonthIso(prevMonthAnchor), end: endOfMonthIso(prevMonthAnchor) };
    }
  }
}

function getComparisonRange(preset: FinancePeriodPreset, range: DateRange, today: string): DateRange {
  if (preset === 'month') {
    const dayOfMonth = Number(today.slice(8, 10));
    const prevMonthAnchor = addMonthsIso(startOfMonthIso(today), -1);
    const prevStart = startOfMonthIso(prevMonthAnchor);
    const prevMonthLastDay = Number(endOfMonthIso(prevMonthAnchor).slice(8, 10));
    const prevEnd = `${prevStart.slice(0, 7)}-${String(Math.min(dayOfMonth, prevMonthLastDay)).padStart(2, '0')}`;
    return { start: prevStart, end: prevEnd };
  }
  if (preset === 'last-month') {
    const anchor = addMonthsIso(range.start, -1);
    return { start: startOfMonthIso(anchor), end: endOfMonthIso(anchor) };
  }
  const length = daysBetween(range.start, range.end) + 1;
  return { start: addDaysIso(range.start, -length), end: addDaysIso(range.end, -length) };
}

function resolvePeriod(query: FinanceOverviewQueryDto, today: string = toIso(new Date())): { preset: FinancePeriodPreset; range: DateRange; comparisonRange: DateRange } {
  const preset = query.preset ?? 'month';
  let range: DateRange;
  if (preset === 'custom') {
    if (!query.from || !query.to) {
      throw new BadRequestException('A custom period requires both `from` and `to`.');
    }
    if (query.from > query.to) {
      throw new BadRequestException('`from` must not be after `to`.');
    }
    range = { start: query.from, end: query.to };
  } else {
    range = getPresetRange(preset, today);
  }
  return { preset, range, comparisonRange: getComparisonRange(preset, range, today) };
}

export interface FinanceTrendPoint {
  month: string;
  revenue: number;
  expenses: number;
  net: number;
}

/**
 * Composes Payments' revenue aggregates (TransactionsService) with
 * Expenses' own aggregates (ExpensesService) into the "revenue vs.
 * expenses vs. net result" view the Financial Overview needs — never
 * recomputing what counts as revenue or a paid expense itself. See each
 * injected service's own aggregation methods for where those business
 * rules actually live.
 */
@Injectable()
export class FinanceService {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly expensesService: ExpensesService,
  ) {}

  async getOverview(tenantId: string, query: FinanceOverviewQueryDto): Promise<FinanceOverviewResponseDto> {
    const { preset, range, comparisonRange } = resolvePeriod(query);

    const [revenue, prevRevenue, expenseSummary, prevExpenseSummary, pendingExpenses, recentExpenses, unusualCategoryIncreases] = await Promise.all([
      this.transactionsService.getRevenueSummary(tenantId, { from: range.start, to: range.end }),
      this.transactionsService.getRevenueSummary(tenantId, { from: comparisonRange.start, to: comparisonRange.end }),
      this.expensesService.getSummary(tenantId, { from: range.start, to: range.end }),
      this.expensesService.getSummary(tenantId, { from: comparisonRange.start, to: comparisonRange.end }),
      this.expensesService.getPendingInsights(tenantId),
      this.expensesService.getRecent(tenantId, 6),
      this.expensesService.getUnusualIncreases(tenantId, { from: range.start, to: range.end }, { from: comparisonRange.start, to: comparisonRange.end }),
    ]);

    const netResult = revenue.netRevenue - expenseSummary.totalPaid;
    const previousNetResult = prevRevenue.netRevenue - prevExpenseSummary.totalPaid;
    const profitMargin = revenue.netRevenue > 0 ? Math.round((netResult / revenue.netRevenue) * 100) : 0;

    return {
      period: { preset, range, comparisonRange },
      grossRevenue: revenue.grossRevenue,
      refunds: revenue.refunds,
      netRevenue: revenue.netRevenue,
      previousNetRevenue: prevRevenue.netRevenue,
      totalExpenses: expenseSummary.totalPaid,
      previousTotalExpenses: prevExpenseSummary.totalPaid,
      netResult,
      previousNetResult,
      profitMargin,
      revenueByType: revenue.revenueByType,
      expensesByCategory: expenseSummary.byCategory,
      recurringVsOneTime: expenseSummary.recurringVsOneTime,
      unusualCategoryIncreases,
      pendingExpenses,
      recentExpenses,
    };
  }

  /**
   * Month-bucketed revenue/expenses/net for the trailing `months` whole
   * calendar months (capped at 12) plus the current partial month — the
   * real backend equivalent of the approved frontend's currently-mocked
   * `revenueByMonth`/`expensesByMonth` series. Runs one pair of aggregate
   * queries per month rather than a single unbounded scan — cheap at this
   * bound, and avoids the raw SQL date-bucketing this codebase doesn't use
   * anywhere else.
   */
  async getTrend(tenantId: string, months = 6): Promise<FinanceTrendPoint[]> {
    const boundedMonths = Math.min(Math.max(months, 1), 12);
    const today = toIso(new Date());

    const monthAnchors = Array.from({ length: boundedMonths }, (_, i) => addMonthsIso(startOfMonthIso(today), -(boundedMonths - 1 - i)));

    const points = await Promise.all(
      monthAnchors.map(async (anchor) => {
        const start = startOfMonthIso(anchor);
        const isCurrentMonth = start === startOfMonthIso(today);
        const end = isCurrentMonth ? today : endOfMonthIso(anchor);

        const [revenue, expenseSummary] = await Promise.all([
          this.transactionsService.getRevenueSummary(tenantId, { from: start, to: end }),
          this.expensesService.getSummary(tenantId, { from: start, to: end }),
        ]);

        return {
          month: start.slice(0, 7),
          revenue: revenue.netRevenue,
          expenses: expenseSummary.totalPaid,
          net: revenue.netRevenue - expenseSummary.totalPaid,
        };
      }),
    );

    return points;
  }
}
