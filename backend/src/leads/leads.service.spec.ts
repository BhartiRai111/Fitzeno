import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LeadsService } from './leads.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { UsersService } from '../users/users.service.js';
import type { MembersService } from '../members/members.service.js';
import type { Lead, Member, User } from '../generated/prisma/client.js';

function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 'lead-1',
    tenantId: 'tenant-1',
    firstName: 'Jordan',
    lastName: 'Smith',
    email: 'jordan@example.com',
    phone: null,
    source: 'WEBSITE',
    interest: null,
    status: 'NEW',
    lostReason: null,
    assignedToId: null,
    nextFollowUpAt: null,
    trialScheduledAt: null,
    trialNotes: null,
    convertedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
    assignedTo: null,
    convertedMember: null,
    notes: [],
    ...overrides,
  } as Lead;
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'staff-1',
    tenantId: 'tenant-1',
    email: 'staff@example.com',
    passwordHash: 'hash',
    firstName: 'Sam',
    lastName: 'Staff',
    phone: null,
    role: 'FRONT_DESK',
    status: 'ACTIVE',
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  } as User;
}

function makeMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'member-1',
    tenantId: 'tenant-1',
    userId: null,
    firstName: 'Jordan',
    lastName: 'Smith',
    email: 'jordan@example.com',
    phone: null,
    gender: null,
    dateOfBirth: null,
    addressLine: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
    status: 'ACTIVE',
    joinedOn: new Date(),
    trainerId: null,
    convertedFromLeadId: 'lead-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    trainer: null,
    convertedFromLead: null,
    notes: [],
    ...overrides,
  } as Member;
}

describe('LeadsService', () => {
  let prisma: PrismaService;
  let usersService: UsersService;
  let membersService: MembersService;
  let service: LeadsService;

  beforeEach(() => {
    prisma = {
      lead: {
        create: vi.fn(),
        update: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      leadNote: { create: vi.fn() },
      member: { findUniqueOrThrow: vi.fn() },
      $transaction: vi.fn(async (arg: unknown) => {
        if (typeof arg === 'function') {
          return (arg as (tx: PrismaService) => unknown)(prisma);
        }
        return Promise.all(arg as Promise<unknown>[]);
      }),
    } as unknown as PrismaService;

    usersService = {
      findByIdInTenant: vi.fn(),
    } as unknown as UsersService;

    membersService = {
      findOrCreateForConversion: vi.fn(),
    } as unknown as MembersService;

    service = new LeadsService(prisma, usersService, membersService);
  });

  describe('create', () => {
    it('rejects assigning a lead to a MEMBER-role user', async () => {
      vi.mocked(usersService.findByIdInTenant).mockResolvedValue(makeUser({ role: 'MEMBER' }));

      await expect(
        service.create('tenant-1', { firstName: 'A', lastName: 'B', source: 'WEBSITE' as never, assignedToId: 'u1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates the lead when assignedToId is a valid staff member', async () => {
      vi.mocked(usersService.findByIdInTenant).mockResolvedValue(makeUser({ role: 'FRONT_DESK' }));
      vi.mocked(prisma.lead.create).mockResolvedValue(makeLead({ assignedToId: 'staff-1' }) as never);

      const result = await service.create('tenant-1', {
        firstName: 'A',
        lastName: 'B',
        source: 'WEBSITE' as never,
        assignedToId: 'staff-1',
      });

      expect(result.firstName).toBe('Jordan');
    });
  });

  describe('update', () => {
    it('rejects any update once a lead has converted', async () => {
      vi.mocked(prisma.lead.findFirst).mockResolvedValue(makeLead({ status: 'CONVERTED' }) as never);

      await expect(service.update('tenant-1', 'lead-1', { interest: 'Yoga' })).rejects.toThrow(BadRequestException);
      expect(prisma.lead.update).not.toHaveBeenCalled();
    });

    it('applies a patchable status transition', async () => {
      vi.mocked(prisma.lead.findFirst).mockResolvedValue(makeLead({ status: 'NEW' }) as never);
      vi.mocked(prisma.lead.update).mockResolvedValue(makeLead({ status: 'CONTACTED' }) as never);

      const result = await service.update('tenant-1', 'lead-1', { status: 'CONTACTED' as never });

      expect(result.status).toBe('CONTACTED');
    });

    it('clears nextFollowUpAt when explicitly set to null, but leaves it untouched when omitted', async () => {
      vi.mocked(prisma.lead.findFirst).mockResolvedValue(makeLead() as never);
      vi.mocked(prisma.lead.update).mockResolvedValue(makeLead() as never);

      await service.update('tenant-1', 'lead-1', { nextFollowUpAt: null });
      let call = vi.mocked(prisma.lead.update).mock.calls[0]![0] as { data: Record<string, unknown> };
      expect(call.data.nextFollowUpAt).toBeNull();

      vi.mocked(prisma.lead.update).mockClear();
      await service.update('tenant-1', 'lead-1', { interest: 'Boxing' });
      call = vi.mocked(prisma.lead.update).mock.calls[0]![0] as { data: Record<string, unknown> };
      expect(call.data).not.toHaveProperty('nextFollowUpAt');
    });
  });

  describe('findByIdInTenant', () => {
    it('blocks a TRAINER from viewing a lead not assigned to them', async () => {
      vi.mocked(prisma.lead.findFirst).mockResolvedValue(makeLead({ assignedToId: 'someone-else' }) as never);

      await expect(
        service.findByIdInTenant('tenant-1', 'lead-1', { id: 'trainer-1', role: 'TRAINER' as never }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException for a lead outside the tenant', async () => {
      vi.mocked(prisma.lead.findFirst).mockResolvedValue(null);

      await expect(
        service.findByIdInTenant('tenant-1', 'missing', { id: 'owner-1', role: 'OWNER' as never }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('list', () => {
    it('excludes CONVERTED/LOST from a followUpDueBy query when no explicit status filter is given', async () => {
      vi.mocked(prisma.lead.findMany).mockResolvedValue([]);
      vi.mocked(prisma.lead.count).mockResolvedValue(0);

      await service.list(
        'tenant-1',
        { page: 1, limit: 20, sortOrder: 'desc', skip: 0 } as never,
        { followUpDueBy: '2026-06-01' },
        { id: 'owner-1', role: 'OWNER' as never },
      );

      const call = vi.mocked(prisma.lead.findMany).mock.calls[0]![0] as { where: Record<string, unknown> };
      expect(call.where.nextFollowUpAt).toEqual({ lte: new Date('2026-06-01') });
      expect(call.where.status).toEqual({ notIn: ['CONVERTED', 'LOST'] });
    });

    it('an explicit status filter is respected even alongside followUpDueBy', async () => {
      vi.mocked(prisma.lead.findMany).mockResolvedValue([]);
      vi.mocked(prisma.lead.count).mockResolvedValue(0);

      await service.list(
        'tenant-1',
        { page: 1, limit: 20, sortOrder: 'desc', skip: 0 } as never,
        { status: 'FOLLOW_UP' as never, followUpDueBy: '2026-06-01' },
        { id: 'owner-1', role: 'OWNER' as never },
      );

      const call = vi.mocked(prisma.lead.findMany).mock.calls[0]![0] as { where: Record<string, unknown> };
      expect(call.where.status).toBe('FOLLOW_UP');
    });

    it('scopes a TRAINER to their own assigned leads', async () => {
      vi.mocked(prisma.lead.findMany).mockResolvedValue([]);
      vi.mocked(prisma.lead.count).mockResolvedValue(0);

      await service.list(
        'tenant-1',
        { page: 1, limit: 20, sortOrder: 'desc', skip: 0 } as never,
        {},
        { id: 'trainer-1', role: 'TRAINER' as never },
      );

      const call = vi.mocked(prisma.lead.findMany).mock.calls[0]![0] as { where: Record<string, unknown> };
      expect(call.where.assignedToId).toBe('trainer-1');
    });
  });

  describe('convert', () => {
    it('rejects converting an already-converted lead', async () => {
      vi.mocked(prisma.lead.findFirst).mockResolvedValue(makeLead({ status: 'CONVERTED' }) as never);

      await expect(
        service.convert('tenant-1', 'lead-1', {}, { id: 'owner-1', role: 'OWNER' as never }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates/links the member, marks the lead CONVERTED, and returns the member', async () => {
      vi.mocked(prisma.lead.findFirst).mockResolvedValue(makeLead({ status: 'NEW' }) as never);
      vi.mocked(membersService.findOrCreateForConversion).mockResolvedValue(makeMember() as never);
      vi.mocked(prisma.member.findUniqueOrThrow).mockResolvedValue(makeMember() as never);

      const result = await service.convert('tenant-1', 'lead-1', {}, { id: 'owner-1', role: 'OWNER' as never });

      expect(membersService.findOrCreateForConversion).toHaveBeenCalledWith(
        'tenant-1',
        expect.objectContaining({ firstName: 'Jordan', lastName: 'Smith', email: 'jordan@example.com' }),
        'lead-1',
        expect.objectContaining({ client: prisma }),
      );
      expect(prisma.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'lead-1' }, data: expect.objectContaining({ status: 'CONVERTED' }) }),
      );
      expect(result.id).toBe('member-1');
    });
  });
});
