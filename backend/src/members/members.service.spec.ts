import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MembersService } from './members.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { UsersService } from '../users/users.service.js';
import type { Member, User } from '../generated/prisma/client.js';

/** Includes the relation fields toMemberResponse()/toMemberSummaryResponse() expect at runtime — a plain Member row alone isn't enough since the service always queries with `include`. */
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
    joinedOn: new Date('2026-01-01T00:00:00Z'),
    trainerId: null,
    convertedFromLeadId: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
    trainer: null,
    convertedFromLead: null,
    notes: [],
    ...overrides,
  } as Member;
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'trainer-1',
    tenantId: 'tenant-1',
    email: 'trainer@example.com',
    passwordHash: 'hash',
    firstName: 'Tina',
    lastName: 'Trainer',
    phone: null,
    role: 'TRAINER',
    status: 'ACTIVE',
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  } as User;
}

describe('MembersService', () => {
  let prisma: PrismaService;
  let usersService: UsersService;
  let service: MembersService;

  beforeEach(() => {
    prisma = {
      member: {
        create: vi.fn(),
        update: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      memberNote: { create: vi.fn() },
      $transaction: vi.fn(async (arg: unknown[]) => Promise.all(arg as Promise<unknown>[])),
    } as unknown as PrismaService;

    usersService = {
      findByIdInTenant: vi.fn(),
    } as unknown as UsersService;

    service = new MembersService(prisma, usersService);
  });

  describe('create', () => {
    it('rejects a trainerId that does not reference a TRAINER in this gym', async () => {
      vi.mocked(usersService.findByIdInTenant).mockResolvedValue(makeUser({ role: 'MANAGER' }));

      await expect(
        service.create('tenant-1', { firstName: 'A', lastName: 'B', trainerId: 'not-a-trainer' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.member.create).not.toHaveBeenCalled();
    });

    it('creates the member when trainerId is a valid trainer', async () => {
      vi.mocked(usersService.findByIdInTenant).mockResolvedValue(makeUser({ role: 'TRAINER' }));
      vi.mocked(prisma.member.create).mockResolvedValue(makeMember({ trainerId: 'trainer-1' }) as never);

      const result = await service.create('tenant-1', { firstName: 'A', lastName: 'B', trainerId: 'trainer-1' });

      expect(result.firstName).toBe('Jordan'); // from the mocked create() return
      expect(prisma.member.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ tenantId: 'tenant-1', trainerId: 'trainer-1' }) }),
      );
    });
  });

  describe('findByIdInTenant', () => {
    it('throws NotFoundException when the member does not exist in this tenant', async () => {
      vi.mocked(prisma.member.findFirst).mockResolvedValue(null);

      await expect(
        service.findByIdInTenant('tenant-1', 'missing', { id: 'u1', role: 'OWNER' as never }),
      ).rejects.toThrow(NotFoundException);
    });

    it('allows an OWNER to view any member', async () => {
      vi.mocked(prisma.member.findFirst).mockResolvedValue(makeMember({ trainerId: 'someone-else' }) as never);

      await expect(
        service.findByIdInTenant('tenant-1', 'member-1', { id: 'owner-1', role: 'OWNER' as never }),
      ).resolves.toMatchObject({ id: 'member-1' });
    });

    it('blocks a TRAINER from viewing a member not assigned to them', async () => {
      vi.mocked(prisma.member.findFirst).mockResolvedValue(makeMember({ trainerId: 'other-trainer' }) as never);

      await expect(
        service.findByIdInTenant('tenant-1', 'member-1', { id: 'trainer-1', role: 'TRAINER' as never }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows a TRAINER to view a member assigned to them', async () => {
      vi.mocked(prisma.member.findFirst).mockResolvedValue(makeMember({ trainerId: 'trainer-1' }) as never);

      await expect(
        service.findByIdInTenant('tenant-1', 'member-1', { id: 'trainer-1', role: 'TRAINER' as never }),
      ).resolves.toMatchObject({ id: 'member-1' });
    });
  });

  describe('list', () => {
    it('forces trainerId to the caller for a TRAINER, ignoring any other scoping', async () => {
      vi.mocked(prisma.member.findMany).mockResolvedValue([]);
      vi.mocked(prisma.member.count).mockResolvedValue(0);

      await service.list(
        'tenant-1',
        { page: 1, limit: 20, sortOrder: 'desc', skip: 0 } as never,
        {},
        { id: 'trainer-1', role: 'TRAINER' as never },
      );

      const call = vi.mocked(prisma.member.findMany).mock.calls[0]![0] as { where: Record<string, unknown> };
      expect(call.where.trainerId).toBe('trainer-1');
    });

    it('does not scope by trainer for an OWNER', async () => {
      vi.mocked(prisma.member.findMany).mockResolvedValue([]);
      vi.mocked(prisma.member.count).mockResolvedValue(0);

      await service.list(
        'tenant-1',
        { page: 1, limit: 20, sortOrder: 'desc', skip: 0 } as never,
        {},
        { id: 'owner-1', role: 'OWNER' as never },
      );

      const call = vi.mocked(prisma.member.findMany).mock.calls[0]![0] as { where: Record<string, unknown> };
      expect(call.where.trainerId).toBeUndefined();
    });
  });

  describe('addNote', () => {
    it('throws NotFoundException for a member outside the tenant', async () => {
      vi.mocked(prisma.member.findFirst).mockResolvedValue(null);

      await expect(service.addNote('tenant-1', 'member-1', 'author-1', 'hello')).rejects.toThrow(NotFoundException);
      expect(prisma.memberNote.create).not.toHaveBeenCalled();
    });
  });

  describe('findOrCreateForConversion', () => {
    it('creates a new member when no existing match by email', async () => {
      vi.mocked(prisma.member.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.member.create).mockResolvedValue(makeMember({ convertedFromLeadId: 'lead-1' }) as never);

      const result = await service.findOrCreateForConversion(
        'tenant-1',
        { firstName: 'A', lastName: 'B', email: 'a@example.com', phone: null },
        'lead-1',
      );

      expect(prisma.member.create).toHaveBeenCalled();
      expect(prisma.member.update).not.toHaveBeenCalled();
      expect(result.convertedFromLeadId).toBe('lead-1');
    });

    it('links an existing unconverted member with a matching email instead of creating a duplicate', async () => {
      const existing = makeMember({ id: 'existing-member', convertedFromLeadId: null });
      vi.mocked(prisma.member.findFirst).mockResolvedValue(existing as never);
      vi.mocked(prisma.member.update).mockResolvedValue({ ...existing, convertedFromLeadId: 'lead-2' } as never);

      const result = await service.findOrCreateForConversion(
        'tenant-1',
        { firstName: 'A', lastName: 'B', email: 'jordan@example.com', phone: null },
        'lead-2',
      );

      expect(prisma.member.create).not.toHaveBeenCalled();
      expect(prisma.member.update).toHaveBeenCalledWith({
        where: { id: 'existing-member' },
        data: { convertedFromLeadId: 'lead-2' },
      });
      expect(result.convertedFromLeadId).toBe('lead-2');
    });

    it('creates a new member without a dedup check when the lead has no email', async () => {
      vi.mocked(prisma.member.create).mockResolvedValue(makeMember({ email: null, convertedFromLeadId: 'lead-3' }) as never);

      await service.findOrCreateForConversion(
        'tenant-1',
        { firstName: 'A', lastName: 'B', email: null, phone: '+1-555-0100' },
        'lead-3',
      );

      expect(prisma.member.findFirst).not.toHaveBeenCalled();
      expect(prisma.member.create).toHaveBeenCalled();
    });
  });

  describe('linkPendingPortalUser', () => {
    it('links a pending (unlinked) member with a matching email', async () => {
      vi.mocked(prisma.member.findFirst).mockResolvedValue(makeMember({ id: 'pending-1', userId: null }) as never);

      await service.linkPendingPortalUser('tenant-1', 'jordan@example.com', 'user-99');

      expect(prisma.member.update).toHaveBeenCalledWith({ where: { id: 'pending-1' }, data: { userId: 'user-99' } });
    });

    it('is a no-op when no pending member matches', async () => {
      vi.mocked(prisma.member.findFirst).mockResolvedValue(null);

      await service.linkPendingPortalUser('tenant-1', 'nobody@example.com', 'user-99');

      expect(prisma.member.update).not.toHaveBeenCalled();
    });
  });
});
