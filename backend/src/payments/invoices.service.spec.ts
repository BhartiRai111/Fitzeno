import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InvoicesService } from './invoices.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { MembersService } from '../members/members.service.js';

function makeInvoice(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inv-1',
    tenantId: 'tenant-1',
    memberId: 'member-1',
    transactionId: 'txn-1',
    invoiceNumber: 'INV-000001',
    lineItems: [{ description: 'Growth plan', quantity: 1, unitPrice: 69, amount: 69 }],
    subtotal: 69,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 69,
    issueDate: new Date(),
    dueDate: null,
    createdAt: new Date(),
    member: { id: 'member-1', firstName: 'Jordan', lastName: 'Smith' },
    transaction: { id: 'txn-1', type: 'MEMBERSHIP_PURCHASE', status: 'PAID', method: 'CASH', currency: 'USD' },
    ...overrides,
  };
}

describe('InvoicesService', () => {
  let prisma: PrismaService;
  let membersService: MembersService;
  let service: InvoicesService;

  beforeEach(() => {
    prisma = {
      invoice: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
      invoiceCounter: {
        upsert: vi.fn(),
      },
      $transaction: vi.fn(async (arg: unknown) =>
        typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(prisma) : Promise.all(arg as Promise<unknown>[]),
      ),
    } as unknown as PrismaService;

    membersService = {
      getOwnMemberId: vi.fn().mockResolvedValue('member-1'),
    } as unknown as MembersService;

    service = new InvoicesService(prisma, membersService);
  });

  describe('createForTransaction', () => {
    it('claims a sequential invoice number and creates a single-line invoice mirroring the transaction amount', async () => {
      vi.mocked(prisma.invoiceCounter.upsert).mockResolvedValue({ tenantId: 'tenant-1', lastNumber: 7 } as never);
      vi.mocked(prisma.invoice.create).mockResolvedValue(makeInvoice({ invoiceNumber: 'INV-000007' }) as never);

      const result = await service.createForTransaction(prisma as never, 'tenant-1', {
        id: 'txn-1',
        memberId: 'member-1',
        description: 'Growth plan',
        amount: 69,
      });

      expect(prisma.invoiceCounter.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: 'tenant-1' }, update: { lastNumber: { increment: 1 } } }),
      );
      expect(prisma.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            invoiceNumber: 'INV-000007',
            subtotal: 69,
            totalAmount: 69,
            discountAmount: 0,
            taxAmount: 0,
          }),
        }),
      );
      expect(result).toBeDefined();
    });

    it('pads the invoice number to six digits', async () => {
      vi.mocked(prisma.invoiceCounter.upsert).mockResolvedValue({ tenantId: 'tenant-1', lastNumber: 42 } as never);
      vi.mocked(prisma.invoice.create).mockResolvedValue(makeInvoice() as never);

      await service.createForTransaction(prisma as never, 'tenant-1', {
        id: 'txn-1',
        memberId: 'member-1',
        description: 'Growth plan',
        amount: 69,
      });

      const call = vi.mocked(prisma.invoice.create).mock.calls[0]![0] as { data: { invoiceNumber: string } };
      expect(call.data.invoiceNumber).toBe('INV-000042');
    });
  });

  describe('findByIdInTenant', () => {
    it('throws NotFoundException when the invoice does not exist in this tenant', async () => {
      vi.mocked(prisma.invoice.findFirst).mockResolvedValue(null);
      await expect(service.findByIdInTenant('tenant-1', 'missing')).rejects.toThrow(NotFoundException);
    });

    it('returns the invoice when it exists', async () => {
      vi.mocked(prisma.invoice.findFirst).mockResolvedValue(makeInvoice() as never);
      const result = await service.findByIdInTenant('tenant-1', 'inv-1');
      expect(result.invoiceNumber).toBe('INV-000001');
    });
  });

  describe('findOwnByIdInTenant', () => {
    it('denies a member access to another member\'s invoice', async () => {
      vi.mocked(prisma.invoice.findFirst).mockResolvedValue(makeInvoice({ memberId: 'other-member' }) as never);
      vi.mocked(membersService.getOwnMemberId).mockResolvedValue('member-1');

      await expect(service.findOwnByIdInTenant('tenant-1', 'user-1', 'inv-1')).rejects.toThrow(ForbiddenException);
    });

    it('allows a member to access their own invoice', async () => {
      vi.mocked(prisma.invoice.findFirst).mockResolvedValue(makeInvoice({ memberId: 'member-1' }) as never);
      vi.mocked(membersService.getOwnMemberId).mockResolvedValue('member-1');

      const result = await service.findOwnByIdInTenant('tenant-1', 'user-1', 'inv-1');
      expect(result.id).toBe('inv-1');
    });

    it('throws NotFoundException before checking ownership when the invoice does not exist', async () => {
      vi.mocked(prisma.invoice.findFirst).mockResolvedValue(null);
      await expect(service.findOwnByIdInTenant('tenant-1', 'user-1', 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('list / listOwn', () => {
    it('scopes listOwn to the caller\'s own memberId', async () => {
      vi.mocked(membersService.getOwnMemberId).mockResolvedValue('member-1');
      vi.mocked(prisma.invoice.findMany).mockResolvedValue([]);
      vi.mocked(prisma.invoice.count).mockResolvedValue(0);

      await service.listOwn('tenant-1', 'user-1', { page: 1, limit: 20, sortOrder: 'desc', skip: 0 } as never);

      const call = vi.mocked(prisma.invoice.findMany).mock.calls[0]![0] as { where: { memberId: string } };
      expect(call.where.memberId).toBe('member-1');
    });

    it('filters by issue date range', async () => {
      vi.mocked(prisma.invoice.findMany).mockResolvedValue([]);
      vi.mocked(prisma.invoice.count).mockResolvedValue(0);

      await service.list('tenant-1', {
        page: 1,
        limit: 20,
        sortOrder: 'desc',
        skip: 0,
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
      } as never);

      const call = vi.mocked(prisma.invoice.findMany).mock.calls[0]![0] as { where: { issueDate: { gte: Date; lte: Date } } };
      expect(call.where.issueDate.gte).toBeInstanceOf(Date);
      expect(call.where.issueDate.lte).toBeInstanceOf(Date);
    });
  });
});
