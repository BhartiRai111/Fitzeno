import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ExpenseFrequency, ExpenseStatus } from '../generated/prisma/enums.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PaginatedResult } from '../common/dto/pagination-query.dto.js';
import { toExpenseResponse, type ExpenseResponseDto, type ExpenseWithRelations } from './dto/expense-response.dto.js';
import type { CreateExpenseDto } from './dto/create-expense.dto.js';
import type { UpdateExpenseDto } from './dto/update-expense.dto.js';
import type { ListExpensesQueryDto } from './dto/list-expenses-query.dto.js';

const expenseInclude = {
  recordedByUser: { select: { id: true, firstName: true, lastName: true } },
};

function toUtcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function parseDateOnly(value: string): Date {
  return toUtcMidnight(new Date(value));
}

function todayUtc(): Date {
  return toUtcMidnight(new Date());
}

export interface ExpenseCategoryTotal {
  category: string;
  amount: number;
  share: number;
}

export interface RecurringSplit {
  recurring: number;
  oneTime: number;
}

export interface ExpenseSummary {
  totalPaid: number;
  paidCount: number;
  byCategory: ExpenseCategoryTotal[];
  recurringVsOneTime: RecurringSplit;
}

export interface PendingExpenseInsights {
  pendingAmount: number;
  pendingCount: number;
  overdueAmount: number;
  overdueCount: number;
  dueSoonAmount: number;
  dueSoonCount: number;
}

export interface CategoryChange {
  category: string;
  amount: number;
  previousAmount: number;
  changePercent: number;
}

/**
 * Business-oriented operating-expense CRUD + lifecycle, plus the
 * aggregation methods FinanceService composes with Payments' own revenue
 * data — see the schema's own phase-level comment for why this stays a
 * flat ledger rather than growing accounting-system concepts.
 */
@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Atomically claims the next sequential expense reference for this
   * tenant — the exact same single-row-locked-UPDATE pattern
   * InvoicesService.nextInvoiceNumber already established for invoices,
   * reused rather than reinvented.
   */
  private async nextReference(tx: Prisma.TransactionClient, tenantId: string): Promise<string> {
    const counter = await tx.expenseCounter.upsert({
      where: { tenantId },
      create: { tenantId, lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
    });
    return `EXP-${String(counter.lastNumber).padStart(6, '0')}`;
  }

  async create(tenantId: string, recordedByUserId: string, dto: CreateExpenseDto): Promise<ExpenseResponseDto> {
    const status = dto.status ?? ExpenseStatus.PENDING;
    const now = new Date();

    const expense = await this.prisma.$transaction(async (tx) => {
      const reference = await this.nextReference(tx, tenantId);
      const tenant = await tx.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { currency: true } });

      return tx.expense.create({
        data: {
          tenantId,
          reference,
          title: dto.title,
          category: dto.category,
          amount: dto.amount,
          currency: tenant.currency,
          frequency: dto.frequency ?? ExpenseFrequency.ONE_TIME,
          status,
          method: dto.method,
          vendor: dto.vendor,
          notes: dto.notes,
          date: parseDateOnly(dto.date),
          dueDate: status === ExpenseStatus.PENDING && dto.dueDate ? parseDateOnly(dto.dueDate) : null,
          paidAt: status === ExpenseStatus.PAID ? now : null,
          cancelledAt: status === ExpenseStatus.CANCELLED ? now : null,
          recordedByUserId,
        },
        include: expenseInclude,
      });
    });

    return toExpenseResponse(expense);
  }

  /**
   * The free-form "Edit" action — see UpdateExpenseDto's own comment. A
   * direct status change here recomputes `paidAt`/`cancelledAt` the same
   * way the guarded lifecycle actions do, so a correction made through
   * Edit stays just as historically accurate as one made through the
   * dedicated action.
   */
  async update(tenantId: string, id: string, dto: UpdateExpenseDto): Promise<ExpenseResponseDto> {
    const existing = await this.getRawInTenant(tenantId, id);

    const data: Prisma.ExpenseUpdateInput = {
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.category !== undefined ? { category: dto.category } : {}),
      ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
      ...(dto.date !== undefined ? { date: parseDateOnly(dto.date) } : {}),
      ...(dto.frequency !== undefined ? { frequency: dto.frequency } : {}),
      ...(dto.method !== undefined ? { method: dto.method } : {}),
      ...(dto.vendor !== undefined ? { vendor: dto.vendor } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
    };

    const nextStatus = dto.status ?? existing.status;
    if (dto.status !== undefined && dto.status !== existing.status) {
      data.status = dto.status;
      data.paidAt = dto.status === ExpenseStatus.PAID ? new Date() : null;
      data.cancelledAt = dto.status === ExpenseStatus.CANCELLED ? new Date() : null;
    }
    if (dto.dueDate !== undefined) {
      data.dueDate = nextStatus === ExpenseStatus.PENDING ? parseDateOnly(dto.dueDate) : null;
    } else if (dto.status !== undefined && nextStatus !== ExpenseStatus.PENDING) {
      data.dueDate = null;
    }

    const updated = await this.prisma.expense.update({ where: { id }, data, include: expenseInclude });
    return toExpenseResponse(updated);
  }

  async findByIdInTenant(tenantId: string, id: string): Promise<ExpenseResponseDto> {
    return toExpenseResponse(await this.getRawInTenant(tenantId, id));
  }

  async list(tenantId: string, query: ListExpensesQueryDto): Promise<PaginatedResult<ExpenseResponseDto>> {
    const where: Prisma.ExpenseWhereInput = {
      tenantId,
      ...(query.category ? { category: query.category } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.frequency ? { frequency: query.frequency } : {}),
      ...(query.recurring !== undefined
        ? query.recurring
          ? { frequency: { not: ExpenseFrequency.ONE_TIME } }
          : { frequency: ExpenseFrequency.ONE_TIME }
        : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            date: {
              ...(query.dateFrom ? { gte: parseDateOnly(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: parseDateOnly(query.dateTo) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' as const } },
              { vendor: { contains: query.search, mode: 'insensitive' as const } },
              { reference: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.expense.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { date: query.sortOrder },
        include: expenseInclude,
      }),
      this.prisma.expense.count({ where }),
    ]);

    return new PaginatedResult(items.map(toExpenseResponse), totalItems, query.page, query.limit);
  }

  /** Confirms a pending expense as paid. */
  async markPaid(tenantId: string, id: string): Promise<ExpenseResponseDto> {
    await this.transitionFromStatus(tenantId, id, ExpenseStatus.PENDING, { status: ExpenseStatus.PAID, paidAt: new Date() });
    return this.findByIdInTenant(tenantId, id);
  }

  /** Voids a still-pending expense — it never counts toward any total. */
  async cancel(tenantId: string, id: string): Promise<ExpenseResponseDto> {
    await this.transitionFromStatus(tenantId, id, ExpenseStatus.PENDING, { status: ExpenseStatus.CANCELLED, cancelledAt: new Date() });
    return this.findByIdInTenant(tenantId, id);
  }

  /** Restores a cancelled expense back to pending — matches the approved frontend's "Reopen as Pending" action, defaulting a missing due date to today. */
  async reopen(tenantId: string, id: string): Promise<ExpenseResponseDto> {
    const existing = await this.getRawInTenant(tenantId, id);
    if (existing.status !== ExpenseStatus.CANCELLED) {
      throw new BadRequestException(`Cannot reopen an expense with status ${existing.status}.`);
    }
    await this.prisma.expense.update({
      where: { id },
      data: { status: ExpenseStatus.PENDING, cancelledAt: null, dueDate: existing.dueDate ?? todayUtc() },
    });
    return this.findByIdInTenant(tenantId, id);
  }

  /**
   * A single atomic `updateMany` guarded by the expected current status —
   * mirrors TransactionsService.transitionFromPending exactly, safe
   * against two staff members racing to transition the same row.
   */
  private async transitionFromStatus(
    tenantId: string,
    id: string,
    expectedStatus: ExpenseStatus,
    data: { status: ExpenseStatus; paidAt?: Date; cancelledAt?: Date },
  ): Promise<void> {
    const existing = await this.prisma.expense.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new NotFoundException('Expense not found.');
    }
    const result = await this.prisma.expense.updateMany({ where: { id, tenantId, status: expectedStatus }, data });
    if (result.count === 0) {
      throw new BadRequestException(`Cannot transition an expense with status ${existing.status}.`);
    }
  }

  private async getRawInTenant(tenantId: string, id: string): Promise<ExpenseWithRelations> {
    const expense = await this.prisma.expense.findFirst({ where: { id, tenantId }, include: expenseInclude });
    if (!expense) {
      throw new NotFoundException('Expense not found.');
    }
    return expense;
  }

  // -----------------------------------------------------------------------
  // Aggregation — consumed by FinanceService (see finance/finance.service.ts)
  // alongside Payments' own revenue aggregates. Only PAID expenses ever
  // count toward a total, matching TransactionStatus.PAID's own role as
  // the only status Payments counts as real revenue — a PENDING expense is
  // a known-but-not-yet-settled obligation, and a CANCELLED one never
  // happened at all.
  // -----------------------------------------------------------------------

  /** Paid-expense totals within an inclusive date range (filtered on `date`, not `paidAt` — matches the approved frontend's own `getTotalExpensesInRange`). */
  async getSummary(tenantId: string, range?: { from?: string; to?: string }): Promise<ExpenseSummary> {
    const dateWhere =
      range?.from || range?.to
        ? {
            date: {
              ...(range.from ? { gte: parseDateOnly(range.from) } : {}),
              ...(range.to ? { lte: parseDateOnly(range.to) } : {}),
            },
          }
        : {};

    const [totalAgg, byCategory, recurringAgg, oneTimeAgg] = await Promise.all([
      this.prisma.expense.aggregate({ where: { tenantId, status: ExpenseStatus.PAID, ...dateWhere }, _sum: { amount: true }, _count: true }),
      this.prisma.expense.groupBy({ by: ['category'], where: { tenantId, status: ExpenseStatus.PAID, ...dateWhere }, _sum: { amount: true } }),
      this.prisma.expense.aggregate({
        where: { tenantId, status: ExpenseStatus.PAID, frequency: { not: ExpenseFrequency.ONE_TIME }, ...dateWhere },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: { tenantId, status: ExpenseStatus.PAID, frequency: ExpenseFrequency.ONE_TIME, ...dateWhere },
        _sum: { amount: true },
      }),
    ]);

    const totalPaid = Number(totalAgg._sum.amount ?? 0);
    const byCategoryTotals = byCategory
      .map((row) => ({ category: row.category, amount: Number(row._sum.amount ?? 0) }))
      .sort((a, b) => b.amount - a.amount);

    return {
      totalPaid,
      paidCount: totalAgg._count,
      byCategory: byCategoryTotals.map((row) => ({
        ...row,
        share: totalPaid > 0 ? Math.round((row.amount / totalPaid) * 100) : 0,
      })),
      recurringVsOneTime: {
        recurring: Number(recurringAgg._sum.amount ?? 0),
        oneTime: Number(oneTimeAgg._sum.amount ?? 0),
      },
    };
  }

  /** Current-state pending/overdue/due-soon figures — deliberately NOT period-filtered, matching the approved frontend's own "operational insights" convention (Reports Overview, Finances Overview). */
  async getPendingInsights(tenantId: string, dueSoonWithinDays = 7): Promise<PendingExpenseInsights> {
    const today = todayUtc();
    const dueSoonBoundary = new Date(today);
    dueSoonBoundary.setUTCDate(dueSoonBoundary.getUTCDate() + dueSoonWithinDays);

    const [pendingAgg, overdueAgg, dueSoonAgg] = await Promise.all([
      this.prisma.expense.aggregate({ where: { tenantId, status: ExpenseStatus.PENDING }, _sum: { amount: true }, _count: true }),
      this.prisma.expense.aggregate({
        where: { tenantId, status: ExpenseStatus.PENDING, dueDate: { lt: today } },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.expense.aggregate({
        where: { tenantId, status: ExpenseStatus.PENDING, dueDate: { gte: today, lte: dueSoonBoundary } },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      pendingAmount: Number(pendingAgg._sum.amount ?? 0),
      pendingCount: pendingAgg._count,
      overdueAmount: Number(overdueAgg._sum.amount ?? 0),
      overdueCount: overdueAgg._count,
      dueSoonAmount: Number(dueSoonAgg._sum.amount ?? 0),
      dueSoonCount: dueSoonAgg._count,
    };
  }

  /** Most recent expenses regardless of period — powers a "recent expenses" widget. */
  async getRecent(tenantId: string, limit = 6): Promise<ExpenseResponseDto[]> {
    const items = await this.prisma.expense.findMany({
      where: { tenantId },
      orderBy: { date: 'desc' },
      take: limit,
      include: expenseInclude,
    });
    return items.map(toExpenseResponse);
  }

  /**
   * Flags categories whose paid spend rose sharply vs. a comparison
   * period — a direct backend port of the approved frontend's own
   * `getUnusualIncreases`. Only compares against a real prior baseline: a
   * category with no spend in the comparison period is "new," not
   * "increased," so it's left out rather than reported as a misleading
   * +100%.
   */
  async getUnusualIncreases(
    tenantId: string,
    range: { from: string; to: string },
    comparisonRange: { from: string; to: string },
    thresholdPercent = 25,
    minAmount = 50,
  ): Promise<CategoryChange[]> {
    const [current, previous] = await Promise.all([
      this.getSummary(tenantId, range),
      this.getSummary(tenantId, comparisonRange),
    ]);
    const prevMap = new Map(previous.byCategory.map((c) => [c.category, c.amount]));

    return current.byCategory
      .filter((c) => c.amount >= minAmount)
      .map((c) => {
        const previousAmount = prevMap.get(c.category) ?? 0;
        const changePercent = previousAmount > 0 ? Math.round(((c.amount - previousAmount) / previousAmount) * 100) : 0;
        return { category: c.category, amount: c.amount, previousAmount, changePercent };
      })
      .filter((c) => c.previousAmount > 0 && c.changePercent >= thresholdPercent)
      .sort((a, b) => b.changePercent - a.changePercent);
  }
}
