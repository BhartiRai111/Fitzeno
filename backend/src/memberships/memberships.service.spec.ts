import { BadRequestException, ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MembershipsService } from './memberships.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { MembersService } from '../members/members.service.js';
import type { MembershipPlansService } from '../membership-plans/membership-plans.service.js';
import type { TransactionsService } from '../payments/transactions.service.js';

const TODAY = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));

function daysFromToday(days: number): Date {
  const d = new Date(TODAY);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function makePlan(overrides: Record<string, unknown> = {}) {
  return { id: 'plan-1', tenantId: 'tenant-1', name: 'Growth', price: 69, billingPeriod: 'MONTHLY', status: 'ACTIVE', ...overrides };
}

function makeMembership(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ms-1',
    tenantId: 'tenant-1',
    memberId: 'member-1',
    planId: 'plan-1',
    planName: 'Growth',
    price: 69,
    billingPeriod: 'MONTHLY',
    startDate: daysFromToday(-10),
    endDate: daysFromToday(20),
    status: 'ACTIVE',
    frozenAt: null,
    cancelledAt: null,
    cancellationReason: null,
    paymentMethod: null,
    paymentReference: null,
    renewedFromId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    member: { id: 'member-1', firstName: 'Jordan', lastName: 'Smith' },
    plan: { id: 'plan-1', name: 'Growth' },
    renewedInto: null,
    ...overrides,
  };
}

describe('MembershipsService', () => {
  let prisma: PrismaService;
  let membersService: MembersService;
  let membershipPlansService: MembershipPlansService;
  let transactionsService: TransactionsService;
  let service: MembershipsService;

  beforeEach(() => {
    prisma = {
      memberMembership: {
        create: vi.fn(),
        update: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
      $transaction: vi.fn(async (arg: unknown) =>
        typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(prisma) : Promise.all(arg as Promise<unknown>[]),
      ),
    } as unknown as PrismaService;

    membersService = {
      getMemberInTenant: vi.fn().mockResolvedValue({ id: 'member-1', status: 'ACTIVE' }),
      getOwnMemberId: vi.fn().mockResolvedValue('member-1'),
    } as unknown as MembersService;

    membershipPlansService = {
      getActivePlanOrThrow: vi.fn().mockResolvedValue(makePlan()),
    } as unknown as MembershipPlansService;

    transactionsService = {
      recordWithinTransaction: vi.fn().mockResolvedValue({ id: 'txn-1' }),
    } as unknown as TransactionsService;

    service = new MembershipsService(prisma, membersService, membershipPlansService, transactionsService);
  });

  describe('create', () => {
    it('rejects when the member already has an overlapping period', async () => {
      vi.mocked(prisma.memberMembership.findFirst).mockResolvedValue(makeMembership() as never);

      await expect(service.create('tenant-1', { memberId: 'member-1', planId: 'plan-1' })).rejects.toThrow(ConflictException);
      expect(prisma.memberMembership.create).not.toHaveBeenCalled();
    });

    it('creates a MONTHLY membership starting today with a one-month endDate', async () => {
      vi.mocked(prisma.memberMembership.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.memberMembership.create).mockResolvedValue(makeMembership() as never);

      await service.create('tenant-1', { memberId: 'member-1', planId: 'plan-1' });

      const call = vi.mocked(prisma.memberMembership.create).mock.calls[0]![0] as { data: { startDate: Date; endDate: Date } };
      const expectedEnd = new Date(call.data.startDate);
      expectedEnd.setUTCMonth(expectedEnd.getUTCMonth() + 1);
      expect(call.data.endDate.getTime()).toBe(expectedEnd.getTime());
    });

    it('propagates a rejected inactive/archived plan', async () => {
      vi.mocked(membershipPlansService.getActivePlanOrThrow).mockRejectedValue(new BadRequestException('archived'));
      await expect(service.create('tenant-1', { memberId: 'member-1', planId: 'plan-1' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('renew', () => {
    it('rejects renewing a cancelled membership', async () => {
      vi.mocked(prisma.memberMembership.findFirst).mockResolvedValue(makeMembership({ status: 'CANCELLED' }) as never);
      await expect(service.renew('tenant-1', 'ms-1', {})).rejects.toThrow(BadRequestException);
    });

    it('rejects renewing a period that has already been renewed into a later one', async () => {
      vi.mocked(prisma.memberMembership.findFirst).mockResolvedValue(makeMembership() as never);
      vi.mocked(prisma.memberMembership.findUnique).mockResolvedValue({ id: 'ms-2' } as never);
      await expect(service.renew('tenant-1', 'ms-1', {})).rejects.toThrow(ConflictException);
    });

    it('stacks the new period onto the current endDate when still in the future', async () => {
      const current = makeMembership({ endDate: daysFromToday(20) });
      vi.mocked(prisma.memberMembership.findFirst)
        .mockResolvedValueOnce(current as never) // load current
        .mockResolvedValueOnce(null); // overlap check
      vi.mocked(prisma.memberMembership.create).mockResolvedValue(makeMembership() as never);

      await service.renew('tenant-1', 'ms-1', {});

      const call = vi.mocked(prisma.memberMembership.create).mock.calls[0]![0] as { data: { startDate: Date; renewedFromId: string } };
      const expectedStart = new Date(current.endDate);
      expectedStart.setUTCDate(expectedStart.getUTCDate() + 1);
      expect(call.data.startDate.getTime()).toBe(expectedStart.getTime());
      expect(call.data.renewedFromId).toBe('ms-1');
    });

    it('starts fresh from today when the current period has already expired', async () => {
      const current = makeMembership({ endDate: daysFromToday(-5) });
      vi.mocked(prisma.memberMembership.findFirst).mockResolvedValueOnce(current as never).mockResolvedValueOnce(null);
      vi.mocked(prisma.memberMembership.create).mockResolvedValue(makeMembership() as never);

      await service.renew('tenant-1', 'ms-1', {});

      const call = vi.mocked(prisma.memberMembership.create).mock.calls[0]![0] as { data: { startDate: Date } };
      expect(call.data.startDate.getTime()).toBe(TODAY.getTime());
    });

    it('renews onto a different plan when planId is switched', async () => {
      vi.mocked(prisma.memberMembership.findFirst).mockResolvedValueOnce(makeMembership() as never).mockResolvedValueOnce(null);
      vi.mocked(membershipPlansService.getActivePlanOrThrow).mockResolvedValue(makePlan({ id: 'plan-2', name: 'Elite', price: 119 }) as never);
      vi.mocked(prisma.memberMembership.create).mockResolvedValue(makeMembership() as never);

      await service.renew('tenant-1', 'ms-1', { planId: 'plan-2' });

      const call = vi.mocked(prisma.memberMembership.create).mock.calls[0]![0] as { data: { planName: string; price: number } };
      expect(call.data.planName).toBe('Elite');
      expect(call.data.price).toBe(119);
    });
  });

  describe('freeze / unfreeze', () => {
    it('rejects freezing a membership that is not currently active', async () => {
      vi.mocked(prisma.memberMembership.findFirst).mockResolvedValue(makeMembership({ endDate: daysFromToday(-1) }) as never);
      await expect(service.freeze('tenant-1', 'ms-1')).rejects.toThrow(BadRequestException);
    });

    it('freezes an active membership', async () => {
      vi.mocked(prisma.memberMembership.findFirst).mockResolvedValue(makeMembership() as never);
      vi.mocked(prisma.memberMembership.update).mockResolvedValue(makeMembership({ status: 'FROZEN', frozenAt: new Date() }) as never);

      const result = await service.freeze('tenant-1', 'ms-1');
      expect(result.status).toBe('FROZEN');
      expect(prisma.memberMembership.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'FROZEN' }) }),
      );
    });

    it('rejects unfreezing a membership that is not frozen', async () => {
      vi.mocked(prisma.memberMembership.findFirst).mockResolvedValue(makeMembership({ status: 'ACTIVE' }) as never);
      await expect(service.unfreeze('tenant-1', 'ms-1')).rejects.toThrow(BadRequestException);
    });

    it('extends endDate by the number of days spent frozen', async () => {
      const frozenAt = daysFromToday(-5);
      const originalEnd = daysFromToday(10);
      vi.mocked(prisma.memberMembership.findFirst).mockResolvedValue(
        makeMembership({ status: 'FROZEN', frozenAt, endDate: originalEnd }) as never,
      );
      vi.mocked(prisma.memberMembership.update).mockResolvedValue(makeMembership() as never);

      await service.unfreeze('tenant-1', 'ms-1');

      const call = vi.mocked(prisma.memberMembership.update).mock.calls[0]![0] as { data: { endDate: Date; frozenAt: null } };
      const expectedEnd = new Date(originalEnd);
      expectedEnd.setUTCDate(expectedEnd.getUTCDate() + 5);
      expect(call.data.endDate.getTime()).toBe(expectedEnd.getTime());
      expect(call.data.frozenAt).toBeNull();
    });
  });

  describe('cancel', () => {
    it('rejects cancelling an already-cancelled membership', async () => {
      vi.mocked(prisma.memberMembership.findFirst).mockResolvedValue(makeMembership({ status: 'CANCELLED' }) as never);
      await expect(service.cancel('tenant-1', 'ms-1')).rejects.toThrow(BadRequestException);
    });

    it('cancels an active membership with a reason', async () => {
      vi.mocked(prisma.memberMembership.findFirst).mockResolvedValue(makeMembership() as never);
      vi.mocked(prisma.memberMembership.update).mockResolvedValue(makeMembership({ status: 'CANCELLED' }) as never);

      const result = await service.cancel('tenant-1', 'ms-1', 'No longer needed');
      expect(result.status).toBe('CANCELLED');
      expect(prisma.memberMembership.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ cancellationReason: 'No longer needed' }) }),
      );
    });
  });

  describe('purchaseOrRenewForSelf', () => {
    it('creates a fresh membership when the member has none', async () => {
      vi.mocked(prisma.memberMembership.findFirst).mockResolvedValue(null); // getCurrentForMember: all lookups null
      vi.mocked(prisma.memberMembership.create).mockResolvedValue(makeMembership() as never);

      await service.purchaseOrRenewForSelf('tenant-1', 'user-1', { planId: 'plan-1' });

      expect(membersService.getOwnMemberId).toHaveBeenCalledWith('tenant-1', 'user-1');
      const call = vi.mocked(prisma.memberMembership.create).mock.calls[0]![0] as { data: { renewedFromId?: string } };
      expect(call.data.renewedFromId).toBeUndefined();
    });

    it('renews when the member has a non-cancelled current membership', async () => {
      const current = makeMembership();
      vi.mocked(prisma.memberMembership.findFirst)
        .mockResolvedValueOnce(current as never) // getCurrentForMember: in-progress lookup
        .mockResolvedValueOnce(current as never) // renewInternal: load current
        .mockResolvedValueOnce(null); // renewInternal: overlap check
      vi.mocked(prisma.memberMembership.create).mockResolvedValue(makeMembership() as never);

      await service.purchaseOrRenewForSelf('tenant-1', 'user-1', { planId: 'plan-1' });

      const call = vi.mocked(prisma.memberMembership.create).mock.calls[0]![0] as { data: { renewedFromId: string } };
      expect(call.data.renewedFromId).toBe('ms-1');
    });
  });

  describe('list', () => {
    it('translates the EXPIRING filter into a bounded active-endDate window', async () => {
      vi.mocked(prisma.memberMembership.findMany).mockResolvedValue([]);
      vi.mocked(prisma.memberMembership.count).mockResolvedValue(0);

      await service.list('tenant-1', {
        page: 1,
        limit: 20,
        sortOrder: 'desc',
        skip: 0,
        effectiveStatus: 'EXPIRING' as never,
      } as never);

      const call = vi.mocked(prisma.memberMembership.findMany).mock.calls[0]![0] as { where: { status: string; endDate: { gte: Date; lte: Date } } };
      expect(call.where.status).toBe('ACTIVE');
      expect(call.where.endDate.gte.getTime()).toBe(TODAY.getTime());
    });
  });
});
