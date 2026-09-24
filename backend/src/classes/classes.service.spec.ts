import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClassesService } from './classes.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { UsersService } from '../users/users.service.js';
import type { User } from '../generated/prisma/client.js';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'trainer-user-1',
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

describe('ClassesService', () => {
  let prisma: PrismaService;
  let usersService: UsersService;
  let service: ClassesService;

  beforeEach(() => {
    prisma = {
      classSeries: {
        create: vi.fn(),
        update: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      classOccurrence: {
        createMany: vi.fn().mockResolvedValue({ count: 0 }),
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      classBooking: {
        count: vi.fn().mockResolvedValue(0),
        updateMany: vi.fn(),
      },
      personalTrainingSession: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      $transaction: vi.fn(async (arg: unknown) => (Array.isArray(arg) ? Promise.all(arg) : (arg as (tx: unknown) => unknown)(prisma))),
    } as unknown as PrismaService;

    usersService = { findByIdInTenant: vi.fn() } as unknown as UsersService;
    service = new ClassesService(prisma, usersService);
  });

  describe('createSeries', () => {
    it('rejects a trainerId that is not a TRAINER-role user', async () => {
      vi.mocked(usersService.findByIdInTenant).mockResolvedValue(makeUser({ role: 'MANAGER' }));

      await expect(
        service.createSeries('tenant-1', {
          name: 'Spin',
          category: 'Spin',
          trainerId: 'trainer-user-1',
          dayOfWeek: 'MON',
          startTime: '06:00',
          durationMinutes: 45,
          capacity: 20,
          location: 'Studio A',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a schedule that overlaps the trainer\'s other active class on the same day', async () => {
      vi.mocked(usersService.findByIdInTenant).mockResolvedValue(makeUser());
      vi.mocked(prisma.classSeries.findMany).mockResolvedValue([
        {
          id: 'series-existing',
          trainerId: 'trainer-user-1',
          dayOfWeek: 'MON',
          startTime: '06:00',
          durationMinutes: 60,
          startDate: new Date('2026-01-01'),
          endDate: null,
          status: 'ACTIVE',
        },
      ] as never);

      await expect(
        service.createSeries('tenant-1', {
          name: 'HIIT',
          category: 'HIIT',
          trainerId: 'trainer-user-1',
          dayOfWeek: 'MON',
          startTime: '06:30',
          durationMinutes: 45,
          capacity: 16,
          location: 'Studio B',
          startDate: '2026-02-01',
        }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.classSeries.create).not.toHaveBeenCalled();
    });

    it('creates the series when there is no conflict', async () => {
      vi.mocked(usersService.findByIdInTenant).mockResolvedValue(makeUser());
      vi.mocked(prisma.classSeries.findMany).mockResolvedValue([]);
      vi.mocked(prisma.classSeries.create).mockResolvedValue({
        id: 'series-1',
        tenantId: 'tenant-1',
        name: 'Spin',
        category: 'Spin',
        description: null,
        trainerId: 'trainer-user-1',
        trainer: { id: 'trainer-user-1', firstName: 'Tina', lastName: 'Trainer' },
        dayOfWeek: 'MON',
        startTime: '06:00',
        durationMinutes: 45,
        capacity: 20,
        location: 'Studio A',
        status: 'ACTIVE',
        startDate: new Date('2026-02-01'),
        endDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      const result = await service.createSeries('tenant-1', {
        name: 'Spin',
        category: 'Spin',
        trainerId: 'trainer-user-1',
        dayOfWeek: 'MON',
        startTime: '06:00',
        durationMinutes: 45,
        capacity: 20,
        location: 'Studio A',
        startDate: '2026-02-01',
      });
      expect(result.id).toBe('series-1');
    });
  });

  describe('ensureOccurrencesGenerated', () => {
    it('generates one occurrence per matching weekday within the requested range', async () => {
      vi.mocked(prisma.classSeries.findMany).mockResolvedValue([
        {
          id: 'series-1',
          tenantId: 'tenant-1',
          dayOfWeek: 'MON',
          startTime: '06:00',
          durationMinutes: 45,
          trainerId: 'trainer-user-1',
          location: 'Studio A',
          capacity: 20,
          startDate: new Date('2026-01-01'),
          endDate: null,
          status: 'ACTIVE',
        },
      ] as never);

      // 2026-02-02 is a Monday; a 14-day window should generate exactly 2 Monday occurrences.
      await service.ensureOccurrencesGenerated('tenant-1', new Date('2026-02-02'), new Date('2026-02-15'));

      expect(prisma.classOccurrence.createMany).toHaveBeenCalledTimes(1);
      const call = vi.mocked(prisma.classOccurrence.createMany).mock.calls[0]![0] as { data: unknown[]; skipDuplicates: boolean };
      expect(call.data).toHaveLength(2);
      expect(call.skipDuplicates).toBe(true);
    });
  });

  describe('cancelSeries', () => {
    it('rejects cancelling an already-cancelled series', async () => {
      vi.mocked(prisma.classSeries.findFirst).mockResolvedValue({ id: 'series-1', status: 'CANCELLED' } as never);

      await expect(service.cancelSeries('tenant-1', 'series-1')).rejects.toThrow(BadRequestException);
    });

    it('cancels the series and cascades to future occurrences/bookings', async () => {
      vi.mocked(prisma.classSeries.findFirst).mockResolvedValue({ id: 'series-1', status: 'ACTIVE' } as never);
      vi.mocked(prisma.classSeries.update).mockResolvedValue({
        id: 'series-1',
        status: 'CANCELLED',
        trainer: { id: 'trainer-user-1', firstName: 'Tina', lastName: 'Trainer' },
      } as never);

      await service.cancelSeries('tenant-1', 'series-1', 'Trainer left the gym.');

      expect(prisma.classOccurrence.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ classSeriesId: 'series-1', status: 'SCHEDULED' }) }),
      );
      expect(prisma.classBooking.updateMany).toHaveBeenCalled();
    });
  });

  describe('cancelOccurrence', () => {
    it('throws NotFoundException outside the tenant', async () => {
      vi.mocked(prisma.classOccurrence.findFirst).mockResolvedValue(null);

      await expect(service.cancelOccurrence('tenant-1', 'occ-1')).rejects.toThrow(NotFoundException);
    });

    it('cancels the occurrence and its active bookings', async () => {
      vi.mocked(prisma.classOccurrence.findFirst).mockResolvedValue({ id: 'occ-1', status: 'SCHEDULED' } as never);
      vi.mocked(prisma.classOccurrence.update).mockResolvedValue({
        id: 'occ-1',
        status: 'CANCELLED',
        classSeries: { name: 'Spin', category: 'Spin' },
        trainer: { id: 'trainer-user-1', firstName: 'Tina', lastName: 'Trainer' },
        bookings: [],
        capacity: 20,
      } as never);

      await service.cancelOccurrence('tenant-1', 'occ-1', 'Trainer sick');

      expect(prisma.classBooking.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { classOccurrenceId: 'occ-1', status: { in: ['CONFIRMED', 'WAITLISTED'] } },
          data: { status: 'CANCELLED', cancelledAt: expect.any(Date) },
        }),
      );
    });
  });
});
