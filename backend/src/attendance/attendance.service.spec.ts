import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AttendanceService } from './attendance.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { MembersService } from '../members/members.service.js';
import type { MembershipsService } from '../memberships/memberships.service.js';
import type { TokenService } from '../auth/token.service.js';

function makeMember(overrides: Record<string, unknown> = {}) {
  return { id: 'member-1', firstName: 'Jordan', lastName: 'Smith', status: 'ACTIVE', ...overrides };
}

function makeCheckInRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'checkin-1',
    tenantId: 'tenant-1',
    memberId: 'member-1',
    method: 'MANUAL',
    recordedByUserId: null,
    checkInAt: new Date(),
    checkOutAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    member: { id: 'member-1', firstName: 'Jordan', lastName: 'Smith' },
    ...overrides,
  };
}

function makeMembership(effectiveStatus: string) {
  return { effectiveStatus };
}

describe('AttendanceService', () => {
  let prisma: PrismaService;
  let membersService: MembersService;
  let membershipsService: MembershipsService;
  let tokenService: TokenService;
  let eventEmitter: EventEmitter2;
  let service: AttendanceService;

  beforeEach(() => {
    prisma = {
      checkIn: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
        groupBy: vi.fn(),
      },
      checkInToken: {
        findUnique: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn(),
      },
      member: {
        findMany: vi.fn(),
      },
      $transaction: vi.fn(async (arg: unknown) =>
        typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(prisma) : Promise.all(arg as Promise<unknown>[]),
      ),
    } as unknown as PrismaService;

    membersService = {
      getMemberInTenant: vi.fn().mockResolvedValue(makeMember()),
      getOwnMemberId: vi.fn(),
    } as unknown as MembersService;

    membershipsService = {
      getCurrentForMember: vi.fn().mockResolvedValue(makeMembership('ACTIVE')),
    } as unknown as MembershipsService;

    tokenService = {
      generateOpaqueToken: vi.fn().mockReturnValue('raw-token'),
      hashToken: vi.fn().mockReturnValue('hashed-token'),
    } as unknown as TokenService;

    eventEmitter = { emit: vi.fn() } as unknown as EventEmitter2;

    service = new AttendanceService(prisma, membersService, membershipsService, tokenService, eventEmitter);
  });

  describe('performCheckIn', () => {
    it('checks in a member with an active membership and no open visit', async () => {
      vi.mocked(prisma.checkIn.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.checkIn.create).mockResolvedValue(makeCheckInRow() as never);

      const result = await service.performCheckIn('tenant-1', 'member-1', 'MANUAL' as never, 'staff-1');

      expect(result.outcome).toBe('CHECKED_IN');
      expect(result.checkIn?.id).toBe('checkin-1');
      expect(prisma.checkIn.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ tenantId: 'tenant-1', memberId: 'member-1', recordedByUserId: 'staff-1' }) }),
      );
    });

    it('returns ALREADY_CHECKED_IN without creating a new row when one is already open', async () => {
      vi.mocked(prisma.checkIn.findFirst).mockResolvedValue(makeCheckInRow() as never);

      const result = await service.performCheckIn('tenant-1', 'member-1', 'MANUAL' as never, null);

      expect(result.outcome).toBe('ALREADY_CHECKED_IN');
      expect(prisma.checkIn.create).not.toHaveBeenCalled();
    });

    it('denies check-in for an expired membership and emits a staff alert', async () => {
      vi.mocked(membershipsService.getCurrentForMember).mockResolvedValue(makeMembership('EXPIRED') as never);

      const result = await service.performCheckIn('tenant-1', 'member-1', 'QR' as never, null);

      expect(result.outcome).toBe('DENIED');
      expect(result.denialReason).toBe('MEMBERSHIP_EXPIRED');
      expect(prisma.checkIn.create).not.toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('check-in.denied', expect.objectContaining({ reason: 'MEMBERSHIP_EXPIRED' }));
    });

    it('denies check-in for a frozen membership', async () => {
      vi.mocked(membershipsService.getCurrentForMember).mockResolvedValue(makeMembership('FROZEN') as never);
      const result = await service.performCheckIn('tenant-1', 'member-1', 'QR' as never, null);
      expect(result.denialReason).toBe('MEMBERSHIP_FROZEN');
    });

    it('denies check-in for a cancelled membership', async () => {
      vi.mocked(membershipsService.getCurrentForMember).mockResolvedValue(makeMembership('CANCELLED') as never);
      const result = await service.performCheckIn('tenant-1', 'member-1', 'QR' as never, null);
      expect(result.denialReason).toBe('MEMBERSHIP_CANCELLED');
    });

    it('denies check-in when the member has no membership at all', async () => {
      vi.mocked(membershipsService.getCurrentForMember).mockResolvedValue(null);
      const result = await service.performCheckIn('tenant-1', 'member-1', 'QR' as never, null);
      expect(result.denialReason).toBe('NO_MEMBERSHIP');
    });

    it('denies check-in for a member marked inactive, without even checking membership', async () => {
      vi.mocked(membersService.getMemberInTenant).mockResolvedValue(makeMember({ status: 'INACTIVE' }) as never);

      const result = await service.performCheckIn('tenant-1', 'member-1', 'QR' as never, null);

      expect(result.denialReason).toBe('MEMBER_INACTIVE');
      expect(membershipsService.getCurrentForMember).not.toHaveBeenCalled();
    });

    it('propagates a not-found error for a cross-gym member id (tenant-scoped lookup)', async () => {
      vi.mocked(membersService.getMemberInTenant).mockRejectedValue(new NotFoundException('Member not found.'));

      await expect(service.performCheckIn('tenant-1', 'member-from-another-gym', 'QR' as never, null)).rejects.toThrow(NotFoundException);
    });
  });

  describe('checkOutSelf', () => {
    it('checks out the open visit', async () => {
      vi.mocked(prisma.checkIn.findFirst).mockResolvedValue(makeCheckInRow() as never);
      vi.mocked(prisma.checkIn.update).mockResolvedValue(makeCheckInRow({ checkOutAt: new Date() }) as never);

      const result = await service.checkOutSelf('tenant-1', 'member-1');

      expect(result.checkOutAt).not.toBeNull();
    });

    it('rejects checking out when there is no open visit', async () => {
      vi.mocked(prisma.checkIn.findFirst).mockResolvedValue(null);

      await expect(service.checkOutSelf('tenant-1', 'member-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('checkOutById', () => {
    it('rejects checking out an already-closed visit', async () => {
      vi.mocked(prisma.checkIn.findFirst).mockResolvedValue(makeCheckInRow({ checkOutAt: new Date() }) as never);

      await expect(service.checkOutById('tenant-1', 'checkin-1')).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException for a check-in outside the tenant', async () => {
      vi.mocked(prisma.checkIn.findFirst).mockResolvedValue(null);

      await expect(service.checkOutById('tenant-1', 'checkin-from-another-gym')).rejects.toThrow(NotFoundException);
    });
  });

  describe('redeemCheckInToken', () => {
    it('rejects a token that does not exist', async () => {
      vi.mocked(prisma.checkInToken.findUnique).mockResolvedValue(null);

      await expect(service.redeemCheckInToken('tenant-1', 'raw', 'staff-1')).rejects.toThrow(BadRequestException);
    });

    it('rejects a token issued for a different tenant', async () => {
      vi.mocked(prisma.checkInToken.findUnique).mockResolvedValue({
        id: 'token-1',
        tenantId: 'other-tenant',
        memberId: 'member-1',
        expiresAt: new Date(Date.now() + 60_000),
        consumedAt: null,
      } as never);

      await expect(service.redeemCheckInToken('tenant-1', 'raw', 'staff-1')).rejects.toThrow(BadRequestException);
    });

    it('rejects an expired token', async () => {
      vi.mocked(prisma.checkInToken.findUnique).mockResolvedValue({
        id: 'token-1',
        tenantId: 'tenant-1',
        memberId: 'member-1',
        expiresAt: new Date(Date.now() - 1000),
        consumedAt: null,
      } as never);

      await expect(service.redeemCheckInToken('tenant-1', 'raw', 'staff-1')).rejects.toThrow(BadRequestException);
    });

    it('rejects an already-consumed token', async () => {
      vi.mocked(prisma.checkInToken.findUnique).mockResolvedValue({
        id: 'token-1',
        tenantId: 'tenant-1',
        memberId: 'member-1',
        expiresAt: new Date(Date.now() + 60_000),
        consumedAt: new Date(),
      } as never);

      await expect(service.redeemCheckInToken('tenant-1', 'raw', 'staff-1')).rejects.toThrow(BadRequestException);
    });

    it('rejects when a concurrent redemption already consumed the token (race guard)', async () => {
      vi.mocked(prisma.checkInToken.findUnique).mockResolvedValue({
        id: 'token-1',
        tenantId: 'tenant-1',
        memberId: 'member-1',
        expiresAt: new Date(Date.now() + 60_000),
        consumedAt: null,
      } as never);
      vi.mocked(prisma.checkInToken.updateMany).mockResolvedValue({ count: 0 });

      await expect(service.redeemCheckInToken('tenant-1', 'raw', 'staff-1')).rejects.toThrow(BadRequestException);
    });

    it('checks in the token\'s member once consumed', async () => {
      vi.mocked(prisma.checkInToken.findUnique).mockResolvedValue({
        id: 'token-1',
        tenantId: 'tenant-1',
        memberId: 'member-1',
        expiresAt: new Date(Date.now() + 60_000),
        consumedAt: null,
      } as never);
      vi.mocked(prisma.checkInToken.updateMany).mockResolvedValue({ count: 1 });
      vi.mocked(prisma.checkIn.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.checkIn.create).mockResolvedValue(makeCheckInRow({ method: 'QR' }) as never);

      const result = await service.redeemCheckInToken('tenant-1', 'raw', 'staff-1');

      expect(result.outcome).toBe('CHECKED_IN');
      expect(prisma.checkIn.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ method: 'QR', recordedByUserId: 'staff-1' }) }),
      );
    });
  });

  describe('issueCheckInToken', () => {
    it('creates a hashed, short-lived token row and returns the raw token', async () => {
      const result = await service.issueCheckInToken('tenant-1', 'member-1');

      expect(result.token).toBe('raw-token');
      expect(result.expiresInSeconds).toBe(AttendanceService.CHECK_IN_TOKEN_TTL_SECONDS);
      expect(prisma.checkInToken.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ tenantId: 'tenant-1', memberId: 'member-1', tokenHash: 'hashed-token' }) }),
      );
    });
  });

  describe('inactiveMembers', () => {
    it('excludes members with a recent check-in and reports days since last visit for the rest', async () => {
      vi.mocked(prisma.member.findMany).mockResolvedValue([
        { id: 'member-1', firstName: 'Active', lastName: 'Recent' },
        { id: 'member-2', firstName: 'Gone', lastName: 'Quiet' },
        { id: 'member-3', firstName: 'Never', lastName: 'Visited' },
      ] as never);
      vi.mocked(prisma.checkIn.groupBy)
        .mockResolvedValueOnce([{ memberId: 'member-1' }] as never) // recent check-ins
        .mockResolvedValueOnce([
          { memberId: 'member-1', _max: { checkInAt: new Date() } },
          { memberId: 'member-2', _max: { checkInAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        ] as never); // last visits

      const result = await service.inactiveMembers('tenant-1', 14);

      // Never-visited members sort first (unbounded inactivity outranks a known gap).
      const ids = result.map((r) => r.memberId);
      expect(ids).toEqual(['member-3', 'member-2']);
      expect(result.find((r) => r.memberId === 'member-2')?.daysSinceLastVisit).toBe(30);
      expect(result.find((r) => r.memberId === 'member-3')?.lastCheckInAt).toBeNull();
    });
  });
});
