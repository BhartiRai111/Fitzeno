import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MembershipPlansService } from './membership-plans.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

function makePlan(overrides: Record<string, unknown> = {}) {
  return {
    id: 'plan-1',
    tenantId: 'tenant-1',
    name: 'Growth',
    description: null,
    price: 69,
    billingPeriod: 'MONTHLY',
    perks: [],
    isPopular: false,
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('MembershipPlansService', () => {
  let prisma: PrismaService;
  let service: MembershipPlansService;

  beforeEach(() => {
    prisma = {
      membershipPlan: {
        create: vi.fn(),
        update: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      memberMembership: {
        groupBy: vi.fn().mockResolvedValue([]),
      },
      $transaction: vi.fn(async (arg: unknown[]) => Promise.all(arg as Promise<unknown>[])),
    } as unknown as PrismaService;

    service = new MembershipPlansService(prisma);
  });

  describe('create', () => {
    it('rejects a duplicate plan name in the same tenant', async () => {
      vi.mocked(prisma.membershipPlan.findUnique).mockResolvedValue(makePlan() as never);

      await expect(
        service.create('tenant-1', { name: 'Growth', price: 69, billingPeriod: 'MONTHLY' as never }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.membershipPlan.create).not.toHaveBeenCalled();
    });

    it('creates the plan when the name is unique', async () => {
      vi.mocked(prisma.membershipPlan.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.membershipPlan.create).mockResolvedValue(makePlan() as never);

      const result = await service.create('tenant-1', { name: 'Growth', price: 69, billingPeriod: 'MONTHLY' as never });
      expect(result.name).toBe('Growth');
      expect(result.price).toBe(69);
    });
  });

  describe('getActivePlanOrThrow', () => {
    it('throws NotFoundException for a plan outside the tenant', async () => {
      vi.mocked(prisma.membershipPlan.findFirst).mockResolvedValue(null);
      await expect(service.getActivePlanOrThrow('tenant-1', 'missing')).rejects.toThrow(NotFoundException);
    });

    it('rejects an archived plan', async () => {
      vi.mocked(prisma.membershipPlan.findFirst).mockResolvedValue(makePlan({ status: 'ARCHIVED' }) as never);
      await expect(service.getActivePlanOrThrow('tenant-1', 'plan-1')).rejects.toThrow(BadRequestException);
    });

    it('returns an active plan', async () => {
      vi.mocked(prisma.membershipPlan.findFirst).mockResolvedValue(makePlan() as never);
      await expect(service.getActivePlanOrThrow('tenant-1', 'plan-1')).resolves.toMatchObject({ id: 'plan-1' });
    });
  });

  describe('archive / activate', () => {
    it('rejects archiving an already-archived plan', async () => {
      vi.mocked(prisma.membershipPlan.findFirst).mockResolvedValue(makePlan({ status: 'ARCHIVED' }) as never);
      await expect(service.archive('tenant-1', 'plan-1')).rejects.toThrow(BadRequestException);
    });

    it('archives an active plan', async () => {
      vi.mocked(prisma.membershipPlan.findFirst).mockResolvedValue(makePlan() as never);
      vi.mocked(prisma.membershipPlan.update).mockResolvedValue(makePlan({ status: 'ARCHIVED' }) as never);
      const result = await service.archive('tenant-1', 'plan-1');
      expect(result.status).toBe('ARCHIVED');
    });

    it('rejects activating an already-active plan', async () => {
      vi.mocked(prisma.membershipPlan.findFirst).mockResolvedValue(makePlan({ status: 'ACTIVE' }) as never);
      await expect(service.activate('tenant-1', 'plan-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('list', () => {
    it('forces status=ACTIVE for a MEMBER caller regardless of the requested filter', async () => {
      vi.mocked(prisma.membershipPlan.findMany).mockResolvedValue([]);
      vi.mocked(prisma.membershipPlan.count).mockResolvedValue(0);

      await service.list(
        'tenant-1',
        { page: 1, limit: 20, sortOrder: 'desc', skip: 0, status: 'ARCHIVED' as never } as never,
        { role: 'MEMBER' as never },
      );

      const call = vi.mocked(prisma.membershipPlan.findMany).mock.calls[0]![0] as { where: Record<string, unknown> };
      expect(call.where.status).toBe('ACTIVE');
    });

    it('does not force a status filter for a staff caller', async () => {
      vi.mocked(prisma.membershipPlan.findMany).mockResolvedValue([]);
      vi.mocked(prisma.membershipPlan.count).mockResolvedValue(0);

      await service.list('tenant-1', { page: 1, limit: 20, sortOrder: 'desc', skip: 0 } as never, { role: 'OWNER' as never });

      const call = vi.mocked(prisma.membershipPlan.findMany).mock.calls[0]![0] as { where: Record<string, unknown> };
      expect(call.where.status).toBeUndefined();
    });
  });
});
