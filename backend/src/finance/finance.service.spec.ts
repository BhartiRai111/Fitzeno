import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FinanceService } from './finance.service.js';
import type { TransactionsService } from '../payments/transactions.service.js';
import type { ExpensesService } from '../expenses/expenses.service.js';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

describe('FinanceService', () => {
  let transactionsService: TransactionsService;
  let expensesService: ExpensesService;
  let service: FinanceService;

  beforeEach(() => {
    transactionsService = {
      getRevenueSummary: vi.fn().mockResolvedValue({ grossRevenue: 0, refunds: 0, netRevenue: 0, paidCount: 0, revenueByType: [] }),
    } as unknown as TransactionsService;

    expensesService = {
      getSummary: vi.fn().mockResolvedValue({ totalPaid: 0, paidCount: 0, byCategory: [], recurringVsOneTime: { recurring: 0, oneTime: 0 } }),
      getPendingInsights: vi.fn().mockResolvedValue({ pendingAmount: 0, pendingCount: 0, overdueAmount: 0, overdueCount: 0, dueSoonAmount: 0, dueSoonCount: 0 }),
      getRecent: vi.fn().mockResolvedValue([]),
      getUnusualIncreases: vi.fn().mockResolvedValue([]),
    } as unknown as ExpensesService;

    service = new FinanceService(transactionsService, expensesService);
  });

  describe('getOverview', () => {
    it('defaults to the "month" preset, ending today', async () => {
      const overview = await service.getOverview('tenant-1', {});

      expect(overview.period.preset).toBe('month');
      expect(overview.period.range.end).toBe(todayIso());
      expect(overview.period.range.start).toBe(`${todayIso().slice(0, 7)}-01`);
    });

    it('resolves "today" to a single-day range', async () => {
      const overview = await service.getOverview('tenant-1', { preset: 'today' });
      expect(overview.period.range).toEqual({ start: todayIso(), end: todayIso() });
    });

    it('rejects a custom period missing from/to', async () => {
      await expect(service.getOverview('tenant-1', { preset: 'custom' })).rejects.toThrow(BadRequestException);
    });

    it('rejects a custom period where from is after to', async () => {
      await expect(service.getOverview('tenant-1', { preset: 'custom', from: '2026-09-30', to: '2026-09-01' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('accepts a valid custom range', async () => {
      const overview = await service.getOverview('tenant-1', { preset: 'custom', from: '2026-08-01', to: '2026-08-31' });
      expect(overview.period.range).toEqual({ start: '2026-08-01', end: '2026-08-31' });
    });

    it('computes netResult as netRevenue minus paid expenses, and a revenue-based profit margin', async () => {
      vi.mocked(transactionsService.getRevenueSummary).mockResolvedValueOnce({
        grossRevenue: 1100,
        refunds: 100,
        netRevenue: 1000,
        paidCount: 5,
        revenueByType: [],
      });
      vi.mocked(expensesService.getSummary).mockResolvedValueOnce({
        totalPaid: 400,
        paidCount: 2,
        byCategory: [],
        recurringVsOneTime: { recurring: 300, oneTime: 100 },
      });

      const overview = await service.getOverview('tenant-1', { preset: 'today' });

      expect(overview.grossRevenue).toBe(1100);
      expect(overview.refunds).toBe(100);
      expect(overview.netRevenue).toBe(1000);
      expect(overview.totalExpenses).toBe(400);
      expect(overview.netResult).toBe(600);
      expect(overview.profitMargin).toBe(60);
    });

    it('reports a zero profit margin when there is no revenue, rather than dividing by zero', async () => {
      const overview = await service.getOverview('tenant-1', { preset: 'today' });
      expect(overview.profitMargin).toBe(0);
    });
  });

  describe('getTrend', () => {
    it('returns the requested number of trailing months, ending with the current month', async () => {
      const points = await service.getTrend('tenant-1', 3);

      expect(points).toHaveLength(3);
      expect(points[2]!.month).toBe(todayIso().slice(0, 7));
    });

    it('caps the requested months at 12', async () => {
      const points = await service.getTrend('tenant-1', 24);
      expect(points).toHaveLength(12);
    });

    it('computes net as revenue minus expenses for each month', async () => {
      vi.mocked(transactionsService.getRevenueSummary).mockResolvedValue({ grossRevenue: 500, refunds: 0, netRevenue: 500, paidCount: 1, revenueByType: [] });
      vi.mocked(expensesService.getSummary).mockResolvedValue({ totalPaid: 200, paidCount: 1, byCategory: [], recurringVsOneTime: { recurring: 0, oneTime: 200 } });

      const points = await service.getTrend('tenant-1', 1);

      expect(points[0]).toEqual({ month: todayIso().slice(0, 7), revenue: 500, expenses: 200, net: 300 });
    });
  });
});
