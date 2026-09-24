import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TrainersService } from './trainers.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { UsersService } from '../users/users.service.js';
import type { User } from '../generated/prisma/client.js';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
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

describe('TrainersService', () => {
  let prisma: PrismaService;
  let usersService: UsersService;
  let service: TrainersService;

  beforeEach(() => {
    prisma = {
      trainer: {
        create: vi.fn(),
        update: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      trainerAvailability: {
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        delete: vi.fn(),
      },
      $transaction: vi.fn(async (arg: unknown) => (Array.isArray(arg) ? Promise.all(arg) : (arg as (tx: unknown) => unknown)(prisma))),
    } as unknown as PrismaService;

    usersService = { findByIdInTenant: vi.fn() } as unknown as UsersService;
    service = new TrainersService(prisma, usersService);
  });

  describe('create', () => {
    it('rejects a userId that is not a TRAINER-role user', async () => {
      vi.mocked(usersService.findByIdInTenant).mockResolvedValue(makeUser({ role: 'MANAGER' }));

      await expect(service.create('tenant-1', { userId: 'user-1' })).rejects.toThrow(BadRequestException);
      expect(prisma.trainer.create).not.toHaveBeenCalled();
    });

    it('rejects when the user already has a trainer profile', async () => {
      vi.mocked(usersService.findByIdInTenant).mockResolvedValue(makeUser());
      vi.mocked(prisma.trainer.findUnique).mockResolvedValue({ id: 'trainer-1' } as never);

      await expect(service.create('tenant-1', { userId: 'user-1' })).rejects.toThrow(ConflictException);
      expect(prisma.trainer.create).not.toHaveBeenCalled();
    });

    it('creates the trainer profile for a valid TRAINER user', async () => {
      vi.mocked(usersService.findByIdInTenant).mockResolvedValue(makeUser());
      vi.mocked(prisma.trainer.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.trainer.create).mockResolvedValue({
        id: 'trainer-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        user: { id: 'user-1', firstName: 'Tina', lastName: 'Trainer', email: null, phone: null },
        bio: null,
        specialties: [],
        certifications: [],
        yearsExperience: null,
        status: 'ACTIVE',
        offersPersonalTraining: true,
        availability: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      const result = await service.create('tenant-1', { userId: 'user-1' });
      expect(result.id).toBe('trainer-1');
    });
  });

  describe('findByIdInTenant', () => {
    it('throws NotFoundException for a trainer outside the tenant', async () => {
      vi.mocked(prisma.trainer.findFirst).mockResolvedValue(null);

      await expect(service.findByIdInTenant('tenant-1', 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('addAvailabilitySlot', () => {
    it('rejects endTime before startTime', async () => {
      vi.mocked(prisma.trainer.findFirst).mockResolvedValue({ id: 'trainer-1' } as never);

      await expect(
        service.addAvailabilitySlot('tenant-1', 'trainer-1', { dayOfWeek: 'MON', startTime: '11:00', endTime: '09:00' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a window overlapping an existing one on the same day', async () => {
      vi.mocked(prisma.trainer.findFirst).mockResolvedValue({ id: 'trainer-1' } as never);
      vi.mocked(prisma.trainerAvailability.findMany).mockResolvedValue([
        { id: 'av-1', trainerId: 'trainer-1', dayOfWeek: 'MON', startTime: '09:00', endTime: '11:00', createdAt: new Date() },
      ] as never);

      await expect(
        service.addAvailabilitySlot('tenant-1', 'trainer-1', { dayOfWeek: 'MON', startTime: '10:00', endTime: '12:00' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.trainerAvailability.create).not.toHaveBeenCalled();
    });

    it('accepts a non-overlapping window on the same day', async () => {
      vi.mocked(prisma.trainer.findFirst).mockResolvedValue({ id: 'trainer-1' } as never);
      vi.mocked(prisma.trainerAvailability.findMany).mockResolvedValue([
        { id: 'av-1', trainerId: 'trainer-1', dayOfWeek: 'MON', startTime: '09:00', endTime: '11:00', createdAt: new Date() },
      ] as never);
      vi.mocked(prisma.trainerAvailability.create).mockResolvedValue({
        id: 'av-2',
        trainerId: 'trainer-1',
        dayOfWeek: 'MON',
        startTime: '14:00',
        endTime: '16:00',
        createdAt: new Date(),
      } as never);

      const result = await service.addAvailabilitySlot('tenant-1', 'trainer-1', {
        dayOfWeek: 'MON',
        startTime: '14:00',
        endTime: '16:00',
      });
      expect(result.startTime).toBe('14:00');
    });
  });
});
