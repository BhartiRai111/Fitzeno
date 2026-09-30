import { ApiProperty } from '@nestjs/swagger';
import type { FinancePeriodPreset } from './finance-overview-query.dto.js';
import type { ExpenseCategoryTotal, RecurringSplit, CategoryChange, PendingExpenseInsights } from '../../expenses/expenses.service.js';
import type { ExpenseResponseDto } from '../../expenses/dto/expense-response.dto.js';

export class DateRangeDto {
  @ApiProperty() start!: string;
  @ApiProperty() end!: string;
}

export class FinancePeriodDto {
  @ApiProperty({ enum: ['today', 'week', 'month', 'last-month', 'custom'] }) preset!: FinancePeriodPreset;
  @ApiProperty({ type: DateRangeDto }) range!: DateRangeDto;
  @ApiProperty({ type: DateRangeDto }) comparisonRange!: DateRangeDto;
}

/**
 * The one response the approved Financial Overview UI needs — revenue,
 * expenses, and net result for the requested period (plus its comparison
 * period), broken down the same ways the approved frontend's own
 * (currently mock-data-driven) Overview tab already displays them. See
 * FinanceService.getOverview for how each figure is composed from
 * Payments' and Expenses' own aggregates — nothing here recomputes what
 * counts as revenue or a paid expense.
 */
export class FinanceOverviewResponseDto {
  @ApiProperty({ type: FinancePeriodDto }) period!: FinancePeriodDto;

  @ApiProperty({ description: 'Sum of every settled (PAID/PARTIALLY_REFUNDED/REFUNDED) transaction\'s amount — before refunds.' })
  grossRevenue!: number;
  @ApiProperty() refunds!: number;
  @ApiProperty({ description: 'grossRevenue - refunds.' })
  netRevenue!: number;
  @ApiProperty() previousNetRevenue!: number;

  @ApiProperty({ description: 'Sum of PAID expenses in the period.' })
  totalExpenses!: number;
  @ApiProperty() previousTotalExpenses!: number;

  @ApiProperty({ description: 'netRevenue - totalExpenses.' })
  netResult!: number;
  @ApiProperty() previousNetResult!: number;
  @ApiProperty({ description: 'netResult as a % of netRevenue. 0 when there is no revenue to measure against.' })
  profitMargin!: number;

  @ApiProperty({ isArray: true }) revenueByType!: { type: string; amount: number }[];
  @ApiProperty({ isArray: true }) expensesByCategory!: ExpenseCategoryTotal[];
  @ApiProperty() recurringVsOneTime!: RecurringSplit;
  @ApiProperty({ isArray: true }) unusualCategoryIncreases!: CategoryChange[];

  @ApiProperty() pendingExpenses!: PendingExpenseInsights;
  @ApiProperty({ isArray: true }) recentExpenses!: ExpenseResponseDto[];
}
