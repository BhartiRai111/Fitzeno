import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TransactionsService } from './transactions.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { MembersService } from '../members/members.service.js';
import type { InvoicesService } from './invoices.service.js';

function makeTransaction(overrides: Record<string, unknown> = {}) {
  return {
    id: 'txn-1',
    tenantId: 'tenant-1',
    memberId: 'member-1',
    type: 'MEMBERSHIP_PURCHASE',
    description: 'Growth plan',
    amount: 69,
    currency: 'USD',
    method: 'CASH',
    status: 'PAID',
    failureReason: null,
    relatedMembershipId: null,
    relatedPtSessionId: null,
    relatedClassBookingId: null,
    recordedByUserId: null,
    idempotencyKey: null,
    paidAt: new Date(),
    cancelledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    member: { id: 'member-1', firstName: 'Jordan', lastName: 'Smith' },
    recordedByUser: null,
    invoice: { invoiceNumber: 'INV-000001' },
    refunds: [],
    ...overrides,
  };
}

describe('TransactionsService', () => {
  let prisma: PrismaService;
  let membersService: MembersService;
  let invoicesService: InvoicesService;
  let service: TransactionsService;

  beforeEach(() => {
    prisma = {
      transaction: {
        create: vi.fn(),
        findUnique: vi.fn().mockResolvedValue(null),
        findUniqueOrThrow: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        updateMany: vi.fn(),
        update: vi.fn(),
        aggregate: vi.fn().mockResolvedValue({ _sum: { amount: null }, _count: 0 }),
        groupBy: vi.fn().mockResolvedValue([]),
      },
      refund: {
        create: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        findUniqueOrThrow: vi.fn(),
        aggregate: vi.fn().mockResolvedValue({ _sum: { amount: null } }),
      },
      tenant: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({ currency: 'USD' }),
      },
      $transaction: vi.fn(async (arg: unknown) =>
        typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(prisma) : Promise.all(arg as Promise<unknown>[]),
      ),
    } as unknown as PrismaService;

    membersService = {
      getMemberInTenant: vi.fn().mockResolvedValue({ id: 'member-1', status: 'ACTIVE' }),
      getOwnMemberId: vi.fn().mockResolvedValue('member-1'),
    } as unknown as MembersService;

    invoicesService = {
      createForTransaction: vi.fn().mockResolvedValue({ id: 'inv-1', invoiceNumber: 'INV-000001' }),
    } as unknown as InvoicesService;

    service = new TransactionsService(prisma, membersService, invoicesService);
  });

  describe('record / recordWithinTransaction', () => {
    it('rejects an initial status other than PENDING or PAID', async () => {
      await expect(
        service.record('tenant-1', {
          memberId: 'member-1',
          type: 'MEMBERSHIP_PURCHASE' as never,
          description: 'x',
          amount: 10,
          method: 'CASH' as never,
          status: 'REFUNDED' as never,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.transaction.create).not.toHaveBeenCalled();
    });

    it('creates a PAID transaction and its invoice', async () => {
      vi.mocked(prisma.transaction.create).mockResolvedValue(makeTransaction() as never);
      vi.mocked(prisma.transaction.findUniqueOrThrow).mockResolvedValue(makeTransaction() as never);

      const result = await service.record('tenant-1', {
        memberId: 'member-1',
        type: 'MEMBERSHIP_PURCHASE' as never,
        description: 'Growth plan',
        amount: 69,
        method: 'CASH' as never,
        status: 'PAID' as never,
      });

      expect(membersService.getMemberInTenant).toHaveBeenCalledWith('tenant-1', 'member-1');
      expect(prisma.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'PAID', paidAt: expect.any(Date) }) }),
      );
      expect(invoicesService.createForTransaction).toHaveBeenCalled();
      expect(result.status).toBe('PAID');
      expect(result.amount).toBe(69);
    });

    it('creates a PENDING transaction with no paidAt', async () => {
      vi.mocked(prisma.transaction.create).mockResolvedValue(makeTransaction({ status: 'PENDING', paidAt: null }) as never);
      vi.mocked(prisma.transaction.findUniqueOrThrow).mockResolvedValue(makeTransaction({ status: 'PENDING', paidAt: null }) as never);

      await service.record('tenant-1', {
        memberId: 'member-1',
        type: 'MEMBERSHIP_PURCHASE' as never,
        description: 'Growth plan',
        amount: 69,
        method: 'ONLINE' as never,
        status: 'PENDING' as never,
      });

      expect(prisma.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING', paidAt: null }) }),
      );
    });

    it('replays an existing transaction for a duplicate idempotency key instead of creating a new one', async () => {
      vi.mocked(prisma.transaction.findUnique).mockResolvedValue(makeTransaction({ idempotencyKey: 'key-1' }) as never);

      const result = await service.record('tenant-1', {
        memberId: 'member-1',
        type: 'MEMBERSHIP_PURCHASE' as never,
        description: 'Growth plan',
        amount: 69,
        method: 'CASH' as never,
        status: 'PAID' as never,
        idempotencyKey: 'key-1',
      });

      expect(prisma.transaction.create).not.toHaveBeenCalled();
      expect(result.id).toBe('txn-1');
    });
  });

  describe('findByIdInTenant / findOwnByIdInTenant', () => {
    it('throws NotFoundException when the transaction does not exist in this tenant', async () => {
      vi.mocked(prisma.transaction.findFirst).mockResolvedValue(null);
      await expect(service.findByIdInTenant('tenant-1', 'missing')).rejects.toThrow(NotFoundException);
    });

    it('denies a member access to another member\'s transaction', async () => {
      vi.mocked(prisma.transaction.findFirst).mockResolvedValue(makeTransaction({ memberId: 'other-member' }) as never);
      vi.mocked(membersService.getOwnMemberId).mockResolvedValue('member-1');

      await expect(service.findOwnByIdInTenant('tenant-1', 'user-1', 'txn-1')).rejects.toThrow(ForbiddenException);
    });

    it('allows a member to access their own transaction', async () => {
      vi.mocked(prisma.transaction.findFirst).mockResolvedValue(makeTransaction({ memberId: 'member-1' }) as never);
      vi.mocked(membersService.getOwnMemberId).mockResolvedValue('member-1');

      const result = await service.findOwnByIdInTenant('tenant-1', 'user-1', 'txn-1');
      expect(result.id).toBe('txn-1');
    });
  });

  describe('markPaid / markFailed / cancel', () => {
    it('marks a pending transaction paid', async () => {
      vi.mocked(prisma.transaction.findFirst)
        .mockResolvedValueOnce(makeTransaction({ status: 'PENDING' }) as never)
        .mockResolvedValueOnce(makeTransaction({ status: 'PAID' }) as never);
      vi.mocked(prisma.transaction.updateMany).mockResolvedValue({ count: 1 } as never);

      const result = await service.markPaid('tenant-1', 'txn-1');
      expect(result.status).toBe('PAID');
      expect(prisma.transaction.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'PAID' }) }),
      );
    });

    it('marks a pending transaction failed with a reason', async () => {
      vi.mocked(prisma.transaction.findFirst)
        .mockResolvedValueOnce(makeTransaction({ status: 'PENDING' }) as never)
        .mockResolvedValueOnce(makeTransaction({ status: 'FAILED', failureReason: 'card declined' }) as never);
      vi.mocked(prisma.transaction.updateMany).mockResolvedValue({ count: 1 } as never);

      const result = await service.markFailed('tenant-1', 'txn-1', 'card declined');
      expect(result.status).toBe('FAILED');
      expect(prisma.transaction.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED', failureReason: 'card declined' }) }),
      );
    });

    it('rejects transitioning a transaction that is not PENDING/PROCESSING', async () => {
      vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce(makeTransaction({ status: 'PAID' }) as never);
      vi.mocked(prisma.transaction.updateMany).mockResolvedValue({ count: 0 } as never);

      await expect(service.markPaid('tenant-1', 'txn-1')).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException transitioning a transaction that does not exist', async () => {
      vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce(null);
      await expect(service.cancel('tenant-1', 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('refund', () => {
    it('rejects refunding a transaction that is not PAID or PARTIALLY_REFUNDED', async () => {
      vi.mocked(prisma.transaction.findFirst).mockResolvedValue(makeTransaction({ status: 'PENDING' }) as never);
      await expect(service.refund('tenant-1', 'txn-1', {})).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException for a refund against a non-existent transaction', async () => {
      vi.mocked(prisma.transaction.findFirst).mockResolvedValue(null);
      await expect(service.refund('tenant-1', 'missing', {})).rejects.toThrow(NotFoundException);
    });

    it('processes a full refund when no amount is given, and marks the transaction REFUNDED', async () => {
      vi.mocked(prisma.transaction.findFirst).mockResolvedValue(makeTransaction({ status: 'PAID', amount: 69 }) as never);
      vi.mocked(prisma.refund.findMany).mockResolvedValue([]);
      vi.mocked(prisma.refund.create).mockResolvedValue({ id: 'refund-1' } as never);
      vi.mocked(prisma.refund.findUniqueOrThrow).mockResolvedValue({
        id: 'refund-1',
        tenantId: 'tenant-1',
        amount: 69,
        reason: null,
        status: 'COMPLETED',
        completedAt: new Date(),
        createdAt: new Date(),
        transaction: { id: 'txn-1', amount: 69, invoice: { invoiceNumber: 'INV-000001' } },
        processedByUser: null,
      } as never);

      const result = await service.refund('tenant-1', 'txn-1', {});

      expect(result.amount).toBe(69);
      expect(prisma.transaction.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'REFUNDED' } }),
      );
    });

    it('processes a partial refund and marks the transaction PARTIALLY_REFUNDED', async () => {
      vi.mocked(prisma.transaction.findFirst).mockResolvedValue(makeTransaction({ status: 'PAID', amount: 100 }) as never);
      vi.mocked(prisma.refund.findMany).mockResolvedValue([]);
      vi.mocked(prisma.refund.create).mockResolvedValue({ id: 'refund-1' } as never);
      vi.mocked(prisma.refund.findUniqueOrThrow).mockResolvedValue({
        id: 'refund-1',
        tenantId: 'tenant-1',
        amount: 30,
        reason: 'Partial dissatisfaction',
        status: 'COMPLETED',
        completedAt: new Date(),
        createdAt: new Date(),
        transaction: { id: 'txn-1', amount: 100, invoice: { invoiceNumber: 'INV-000001' } },
        processedByUser: null,
      } as never);

      const result = await service.refund('tenant-1', 'txn-1', { amount: 30, reason: 'Partial dissatisfaction' });

      expect(result.amount).toBe(30);
      expect(prisma.transaction.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'PARTIALLY_REFUNDED' } }),
      );
    });

    it('rejects a refund amount that exceeds the remaining refundable amount', async () => {
      vi.mocked(prisma.transaction.findFirst).mockResolvedValue(makeTransaction({ status: 'PAID', amount: 100 }) as never);
      vi.mocked(prisma.refund.findMany).mockResolvedValue([{ amount: 80 }] as never);

      await expect(service.refund('tenant-1', 'txn-1', { amount: 30 })).rejects.toThrow(BadRequestException);
      expect(prisma.refund.create).not.toHaveBeenCalled();
    });

    it('rejects a zero or negative refund amount', async () => {
      vi.mocked(prisma.transaction.findFirst).mockResolvedValue(makeTransaction({ status: 'PAID', amount: 100 }) as never);
      vi.mocked(prisma.refund.findMany).mockResolvedValue([]);

      await expect(service.refund('tenant-1', 'txn-1', { amount: 0 })).rejects.toThrow(BadRequestException);
    });

    it('accounts for already-completed refunds when validating a further partial refund', async () => {
      vi.mocked(prisma.transaction.findFirst).mockResolvedValue(makeTransaction({ status: 'PARTIALLY_REFUNDED', amount: 100 }) as never);
      vi.mocked(prisma.refund.findMany).mockResolvedValue([{ amount: 40 }] as never);
      vi.mocked(prisma.refund.create).mockResolvedValue({ id: 'refund-2' } as never);
      vi.mocked(prisma.refund.findUniqueOrThrow).mockResolvedValue({
        id: 'refund-2',
        tenantId: 'tenant-1',
        amount: 60,
        reason: null,
        status: 'COMPLETED',
        completedAt: new Date(),
        createdAt: new Date(),
        transaction: { id: 'txn-1', amount: 100, invoice: { invoiceNumber: 'INV-000001' } },
        processedByUser: null,
      } as never);

      const result = await service.refund('tenant-1', 'txn-1', { amount: 60 });

      expect(result.amount).toBe(60);
      expect(prisma.transaction.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'REFUNDED' } }));
    });
  });

  describe('list', () => {
    it('scopes listOwn to the caller\'s own memberId', async () => {
      vi.mocked(membersService.getOwnMemberId).mockResolvedValue('member-1');
      vi.mocked(prisma.transaction.findMany).mockResolvedValue([]);
      vi.mocked(prisma.transaction.count).mockResolvedValue(0);

      await service.listOwn('tenant-1', 'user-1', { page: 1, limit: 20, sortOrder: 'desc', skip: 0 } as never);

      const call = vi.mocked(prisma.transaction.findMany).mock.calls[0]![0] as { where: { memberId: string } };
      expect(call.where.memberId).toBe('member-1');
    });

    it('filters by amount range', async () => {
      vi.mocked(prisma.transaction.findMany).mockResolvedValue([]);
      vi.mocked(prisma.transaction.count).mockResolvedValue(0);

      await service.list('tenant-1', { page: 1, limit: 20, sortOrder: 'desc', skip: 0, amountMin: 10, amountMax: 100 } as never);

      const call = vi.mocked(prisma.transaction.findMany).mock.calls[0]![0] as { where: { amount: { gte: number; lte: number } } };
      expect(call.where.amount).toEqual({ gte: 10, lte: 100 });
    });
  });

  describe('getStats', () => {
    it('only counts PAID transactions as revenue', async () => {
      vi.mocked(prisma.transaction.aggregate).mockResolvedValueOnce({ _sum: { amount: 500 }, _count: 5 } as never);
      const stats = await service.getStats('tenant-1');
      expect(stats.totalRevenue).toBe(500);
      expect(stats.paidCount).toBe(5);
    });
  });
});
