import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExpensesService } from './expenses.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

function makeExpenseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'expense-1',
    tenantId: 'tenant-1',
    reference: 'EXP-000001',
    title: 'Studio rent',
    category: 'RENT',
    amount: 3200,
    currency: 'GBP',
    frequency: 'MONTHLY',
    status: 'PENDING',
    method: 'BANK_TRANSFER',
    vendor: 'Riverside Property',
    notes: null,
    date: new Date('2026-09-01T00:00:00.000Z'),
    dueDate: null,
    paidAt: null,
    cancelledAt: null,
    recordedByUserId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    recordedByUser: { id: 'user-1', firstName: 'Sam', lastName: 'Carter' },
    ...overrides,
  };
}

describe('ExpensesService', () => {
  let prisma: PrismaService;
  let service: ExpensesService;

  beforeEach(() => {
    prisma = {
      expense: {
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        aggregate: vi.fn(),
        groupBy: vi.fn(),
      },
      expenseCounter: { upsert: vi.fn() },
      tenant: { findUniqueOrThrow: vi.fn().mockResolvedValue({ currency: 'GBP' }) },
      $transaction: vi.fn(async (arg: unknown) =>
        typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(prisma) : Promise.all(arg as Promise<unknown>[]),
      ),
    } as unknown as PrismaService;

    service = new ExpensesService(prisma);
  });

  describe('create', () => {
    it('generates a sequential reference and snapshots the tenant currency', async () => {
      vi.mocked(prisma.expenseCounter.upsert).mockResolvedValue({ tenantId: 'tenant-1', lastNumber: 33 } as never);
      vi.mocked(prisma.expense.create).mockResolvedValue(makeExpenseRow({ reference: 'EXP-000033' }) as never);

      const result = await service.create('tenant-1', 'user-1', {
        title: 'Studio rent',
        category: 'RENT' as never,
        amount: 3200,
        date: '2026-09-01',
        method: 'BANK_TRANSFER' as never,
      });

      expect(result.reference).toBe('EXP-000033');
      expect(prisma.expense.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ currency: 'GBP', reference: 'EXP-000033' }) }),
      );
    });

    it('sets paidAt immediately when created as PAID', async () => {
      vi.mocked(prisma.expenseCounter.upsert).mockResolvedValue({ tenantId: 'tenant-1', lastNumber: 1 } as never);
      vi.mocked(prisma.expense.create).mockResolvedValue(makeExpenseRow({ status: 'PAID', paidAt: new Date() }) as never);

      await service.create('tenant-1', 'user-1', {
        title: 'Cash purchase',
        category: 'SUPPLIES' as never,
        amount: 50,
        date: '2026-09-10',
        status: 'PAID' as never,
        method: 'CASH' as never,
      });

      expect(prisma.expense.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'PAID', paidAt: expect.any(Date) }) }),
      );
    });

    it('only stores a dueDate for a PENDING expense', async () => {
      vi.mocked(prisma.expenseCounter.upsert).mockResolvedValue({ tenantId: 'tenant-1', lastNumber: 1 } as never);
      vi.mocked(prisma.expense.create).mockResolvedValue(makeExpenseRow() as never);

      await service.create('tenant-1', 'user-1', {
        title: 'Equipment',
        category: 'EQUIPMENT' as never,
        amount: 500,
        date: '2026-09-10',
        dueDate: '2026-09-25',
        status: 'PAID' as never,
        method: 'CARD' as never,
      });

      expect(prisma.expense.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ dueDate: null }) }),
      );
    });
  });

  describe('update', () => {
    it('recomputes paidAt when status changes to PAID', async () => {
      vi.mocked(prisma.expense.findFirst).mockResolvedValue(makeExpenseRow({ status: 'PENDING' }) as never);
      vi.mocked(prisma.expense.update).mockResolvedValue(makeExpenseRow({ status: 'PAID' }) as never);

      await service.update('tenant-1', 'expense-1', { status: 'PAID' as never });

      expect(prisma.expense.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'PAID', paidAt: expect.any(Date), cancelledAt: null }) }),
      );
    });

    it('clears dueDate when status moves away from PENDING without an explicit dueDate', async () => {
      vi.mocked(prisma.expense.findFirst).mockResolvedValue(makeExpenseRow({ status: 'PENDING', dueDate: new Date('2026-09-25') }) as never);
      vi.mocked(prisma.expense.update).mockResolvedValue(makeExpenseRow({ status: 'CANCELLED' }) as never);

      await service.update('tenant-1', 'expense-1', { status: 'CANCELLED' as never });

      expect(prisma.expense.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ dueDate: null }) }));
    });

    it('throws NotFoundException for an expense outside the tenant', async () => {
      vi.mocked(prisma.expense.findFirst).mockResolvedValue(null);

      await expect(service.update('tenant-1', 'expense-from-another-gym', { title: 'x' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('markPaid / cancel / reopen', () => {
    it('marks a pending expense paid', async () => {
      vi.mocked(prisma.expense.findFirst)
        .mockResolvedValueOnce(makeExpenseRow({ status: 'PENDING' }) as never)
        .mockResolvedValueOnce(makeExpenseRow({ status: 'PAID' }) as never);
      vi.mocked(prisma.expense.updateMany).mockResolvedValue({ count: 1 });

      const result = await service.markPaid('tenant-1', 'expense-1');

      expect(result.status).toBe('PAID');
      expect(prisma.expense.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'PENDING' }), data: expect.objectContaining({ status: 'PAID' }) }),
      );
    });

    it('rejects marking a cancelled expense as paid', async () => {
      vi.mocked(prisma.expense.findFirst).mockResolvedValue(makeExpenseRow({ status: 'CANCELLED' }) as never);
      vi.mocked(prisma.expense.updateMany).mockResolvedValue({ count: 0 });

      await expect(service.markPaid('tenant-1', 'expense-1')).rejects.toThrow(BadRequestException);
    });

    it('cancels a pending expense', async () => {
      vi.mocked(prisma.expense.findFirst)
        .mockResolvedValueOnce(makeExpenseRow({ status: 'PENDING' }) as never)
        .mockResolvedValueOnce(makeExpenseRow({ status: 'CANCELLED' }) as never);
      vi.mocked(prisma.expense.updateMany).mockResolvedValue({ count: 1 });

      const result = await service.cancel('tenant-1', 'expense-1');
      expect(result.status).toBe('CANCELLED');
    });

    it('rejects cancelling an already-paid expense', async () => {
      vi.mocked(prisma.expense.findFirst).mockResolvedValue(makeExpenseRow({ status: 'PAID' }) as never);
      vi.mocked(prisma.expense.updateMany).mockResolvedValue({ count: 0 });

      await expect(service.cancel('tenant-1', 'expense-1')).rejects.toThrow(BadRequestException);
    });

    it('reopens a cancelled expense back to pending, defaulting a missing due date to today', async () => {
      vi.mocked(prisma.expense.findFirst)
        .mockResolvedValueOnce(makeExpenseRow({ status: 'CANCELLED', dueDate: null }) as never)
        .mockResolvedValueOnce(makeExpenseRow({ status: 'PENDING' }) as never);
      vi.mocked(prisma.expense.update).mockResolvedValue(makeExpenseRow({ status: 'PENDING' }) as never);

      await service.reopen('tenant-1', 'expense-1');

      expect(prisma.expense.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING', cancelledAt: null, dueDate: expect.any(Date) }) }),
      );
    });

    it('rejects reopening a non-cancelled expense', async () => {
      vi.mocked(prisma.expense.findFirst).mockResolvedValue(makeExpenseRow({ status: 'PAID' }) as never);

      await expect(service.reopen('tenant-1', 'expense-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getSummary', () => {
    it('computes category shares and the recurring/one-time split from PAID expenses only', async () => {
      vi.mocked(prisma.expense.aggregate)
        .mockResolvedValueOnce({ _sum: { amount: 1000 }, _count: 3 } as never) // total
        .mockResolvedValueOnce({ _sum: { amount: 700 } } as never) // recurring
        .mockResolvedValueOnce({ _sum: { amount: 300 } } as never); // one-time
      vi.mocked(prisma.expense.groupBy).mockResolvedValue([
        { category: 'RENT', _sum: { amount: 700 } },
        { category: 'SUPPLIES', _sum: { amount: 300 } },
      ] as never);

      const result = await service.getSummary('tenant-1', { from: '2026-09-01', to: '2026-09-30' });

      expect(result.totalPaid).toBe(1000);
      expect(result.byCategory).toEqual([
        { category: 'RENT', amount: 700, share: 70 },
        { category: 'SUPPLIES', amount: 300, share: 30 },
      ]);
      expect(result.recurringVsOneTime).toEqual({ recurring: 700, oneTime: 300 });
    });

    it('returns zero shares when there is no paid spend', async () => {
      vi.mocked(prisma.expense.aggregate).mockResolvedValue({ _sum: { amount: null }, _count: 0 } as never);
      vi.mocked(prisma.expense.groupBy).mockResolvedValue([] as never);

      const result = await service.getSummary('tenant-1', { from: '2026-09-01', to: '2026-09-30' });
      expect(result.totalPaid).toBe(0);
      expect(result.byCategory).toEqual([]);
    });
  });

  describe('getPendingInsights', () => {
    it('separates overdue from due-soon by comparing dueDate to today', async () => {
      vi.mocked(prisma.expense.aggregate)
        .mockResolvedValueOnce({ _sum: { amount: 500 }, _count: 2 } as never) // pending
        .mockResolvedValueOnce({ _sum: { amount: 180 }, _count: 1 } as never) // overdue
        .mockResolvedValueOnce({ _sum: { amount: 320 }, _count: 1 } as never); // due soon

      const result = await service.getPendingInsights('tenant-1');

      expect(result).toEqual({
        pendingAmount: 500,
        pendingCount: 2,
        overdueAmount: 180,
        overdueCount: 1,
        dueSoonAmount: 320,
        dueSoonCount: 1,
      });
    });
  });

  describe('getUnusualIncreases', () => {
    it('flags a category that rose sharply vs. a real prior baseline', async () => {
      vi.mocked(prisma.expense.aggregate)
        .mockResolvedValueOnce({ _sum: { amount: 500 }, _count: 1 } as never)
        .mockResolvedValueOnce({ _sum: { amount: 0 } } as never)
        .mockResolvedValueOnce({ _sum: { amount: 500 } } as never)
        .mockResolvedValueOnce({ _sum: { amount: 400 }, _count: 1 } as never)
        .mockResolvedValueOnce({ _sum: { amount: 0 } } as never)
        .mockResolvedValueOnce({ _sum: { amount: 400 } } as never);
      vi.mocked(prisma.expense.groupBy)
        .mockResolvedValueOnce([{ category: 'MARKETING', _sum: { amount: 500 } }] as never)
        .mockResolvedValueOnce([{ category: 'MARKETING', _sum: { amount: 400 } }] as never);

      const result = await service.getUnusualIncreases(
        'tenant-1',
        { from: '2026-09-01', to: '2026-09-30' },
        { from: '2026-08-01', to: '2026-08-31' },
        10,
        50,
      );

      expect(result).toEqual([{ category: 'MARKETING', amount: 500, previousAmount: 400, changePercent: 25 }]);
    });

    it('does not flag a category with no prior spend as "increased"', async () => {
      vi.mocked(prisma.expense.aggregate)
        .mockResolvedValueOnce({ _sum: { amount: 200 }, _count: 1 } as never)
        .mockResolvedValueOnce({ _sum: { amount: 200 } } as never)
        .mockResolvedValueOnce({ _sum: { amount: 0 } } as never)
        .mockResolvedValueOnce({ _sum: { amount: 0 }, _count: 0 } as never)
        .mockResolvedValueOnce({ _sum: { amount: 0 } } as never)
        .mockResolvedValueOnce({ _sum: { amount: 0 } } as never);
      vi.mocked(prisma.expense.groupBy)
        .mockResolvedValueOnce([{ category: 'MARKETING', _sum: { amount: 200 } }] as never)
        .mockResolvedValueOnce([] as never);

      const result = await service.getUnusualIncreases(
        'tenant-1',
        { from: '2026-09-01', to: '2026-09-30' },
        { from: '2026-08-01', to: '2026-08-31' },
      );

      expect(result).toEqual([]);
    });
  });
});
