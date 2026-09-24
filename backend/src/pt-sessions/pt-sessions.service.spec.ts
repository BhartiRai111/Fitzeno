import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PtSessionsService } from './pt-sessions.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { MembersService } from '../members/members.service.js';
import type { TrainersService } from '../trainers/trainers.service.js';

const FUTURE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
// A Monday, far enough in the future to stay clear of "already started" checks.
const NEXT_MONDAY = (() => {
  const d = new Date(FUTURE);
  const day = d.getUTCDay();
  const diff = (8 - day) % 7 || 7;
  d.setUTCDate(d.getUTCDate() + diff);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
})();

function makeTrainer(overrides: Record<string, unknown> = {}) {
  return {
    id: 'trainer-profile-1',
    userId: 'trainer-user-1',
    status: 'ACTIVE',
    offersPersonalTraining: true,
    availability: [{ id: 'av-1', trainerId: 'trainer-profile-1', dayOfWeek: 'MON', startTime: '09:00', endTime: '12:00', createdAt: new Date() }],
    ...overrides,
  };
}

describe('PtSessionsService', () => {
  let prisma: PrismaService;
  let membersService: MembersService;
  let trainersService: TrainersService;
  let service: PtSessionsService;

  beforeEach(() => {
    prisma = {
      member: { findFirst: vi.fn() },
      classOccurrence: { findMany: vi.fn().mockResolvedValue([]) },
      personalTrainingSession: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        update: vi.fn(),
        findFirst: vi.fn(),
        count: vi.fn(),
      },
      classBooking: { findMany: vi.fn().mockResolvedValue([]) },
      $transaction: vi.fn(async (arg: unknown) =>
        typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(prisma) : Promise.all(arg as Promise<unknown>[]),
      ),
    } as unknown as PrismaService;

    membersService = {} as unknown as MembersService;
    trainersService = { getActiveBookableTrainer: vi.fn() } as unknown as TrainersService;

    service = new PtSessionsService(prisma, membersService, trainersService);
  });

  describe('getAvailableSlots', () => {
    it('subtracts a busy class occurrence from the trainer\'s availability window', async () => {
      vi.mocked(trainersService.getActiveBookableTrainer).mockResolvedValue(makeTrainer() as never);
      vi.mocked(prisma.classOccurrence.findMany).mockResolvedValue([{ startTime: '10:00', endTime: '10:45' }] as never);

      const slots = await service.getAvailableSlots('tenant-1', 'trainer-user-1', NEXT_MONDAY.toISOString().slice(0, 10));

      expect(slots).toEqual([
        { startTime: '09:00', endTime: '10:00' },
        { startTime: '10:45', endTime: '12:00' },
      ]);
    });

    it('returns nothing for a day with no availability windows', async () => {
      vi.mocked(trainersService.getActiveBookableTrainer).mockResolvedValue(makeTrainer({ availability: [] }) as never);

      const slots = await service.getAvailableSlots('tenant-1', 'trainer-user-1', NEXT_MONDAY.toISOString().slice(0, 10));
      expect(slots).toEqual([]);
    });
  });

  describe('book', () => {
    const dateStr = NEXT_MONDAY.toISOString().slice(0, 10);

    it('books a session inside the trainer\'s availability with no conflicts', async () => {
      vi.mocked(trainersService.getActiveBookableTrainer).mockResolvedValue(makeTrainer() as never);
      vi.mocked(prisma.member.findFirst).mockResolvedValue({ id: 'member-1', status: 'ACTIVE' } as never);
      vi.mocked(prisma.personalTrainingSession.create).mockResolvedValue({
        id: 'pt-1',
        trainer: { id: 'trainer-user-1', firstName: 'Tina', lastName: 'Trainer' },
        member: { id: 'member-1', firstName: 'Jordan', lastName: 'Smith' },
        date: NEXT_MONDAY,
        startTime: '09:00',
        durationMinutes: 60,
        status: 'CONFIRMED',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      const result = await service.book('tenant-1', 'trainer-user-1', 'member-1', {
        trainerId: 'trainer-user-1',
        date: dateStr,
        startTime: '09:00',
        durationMinutes: 60,
      });
      expect(result.status).toBe('CONFIRMED');
    });

    it('rejects a time outside the trainer\'s availability window', async () => {
      vi.mocked(trainersService.getActiveBookableTrainer).mockResolvedValue(makeTrainer() as never);

      await expect(
        service.book('tenant-1', 'trainer-user-1', 'member-1', {
          trainerId: 'trainer-user-1',
          date: dateStr,
          startTime: '13:00',
          durationMinutes: 60,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when the trainer already has a class at that time', async () => {
      vi.mocked(trainersService.getActiveBookableTrainer).mockResolvedValue(makeTrainer() as never);
      vi.mocked(prisma.member.findFirst).mockResolvedValue({ id: 'member-1', status: 'ACTIVE' } as never);
      vi.mocked(prisma.classOccurrence.findMany).mockResolvedValue([{ startTime: '09:00', endTime: '10:00' }] as never);

      await expect(
        service.book('tenant-1', 'trainer-user-1', 'member-1', {
          trainerId: 'trainer-user-1',
          date: dateStr,
          startTime: '09:30',
          durationMinutes: 30,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects when the member already has something booked at that time', async () => {
      vi.mocked(trainersService.getActiveBookableTrainer).mockResolvedValue(makeTrainer() as never);
      vi.mocked(prisma.member.findFirst).mockResolvedValue({ id: 'member-1', status: 'ACTIVE' } as never);
      vi.mocked(prisma.personalTrainingSession.findMany).mockResolvedValue([
        { startTime: '09:00', durationMinutes: 60 },
      ] as never);

      await expect(
        service.book('tenant-1', 'trainer-user-1', 'member-1', {
          trainerId: 'trainer-user-1',
          date: dateStr,
          startTime: '09:30',
          durationMinutes: 30,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects a member without an active membership', async () => {
      vi.mocked(trainersService.getActiveBookableTrainer).mockResolvedValue(makeTrainer() as never);
      vi.mocked(prisma.member.findFirst).mockResolvedValue({ id: 'member-1', status: 'INACTIVE' } as never);

      await expect(
        service.book('tenant-1', 'trainer-user-1', 'member-1', {
          trainerId: 'trainer-user-1',
          date: dateStr,
          startTime: '09:00',
          durationMinutes: 60,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancel', () => {
    it('throws ForbiddenException cancelling someone else\'s session', async () => {
      vi.mocked(prisma.personalTrainingSession.findFirst).mockResolvedValue({
        id: 'pt-1',
        memberId: 'other-member',
        status: 'CONFIRMED',
        date: FUTURE,
        startTime: '09:00',
      } as never);

      await expect(service.cancel('tenant-1', 'pt-1', { memberId: 'member-1' })).rejects.toThrow(ForbiddenException);
    });

    it('rejects self-cancelling inside the cancellation window', async () => {
      const soon = new Date(Date.now() + 60 * 60 * 1000);
      vi.mocked(prisma.personalTrainingSession.findFirst).mockResolvedValue({
        id: 'pt-1',
        memberId: 'member-1',
        status: 'CONFIRMED',
        date: soon,
        startTime: `${soon.getUTCHours().toString().padStart(2, '0')}:${soon.getUTCMinutes().toString().padStart(2, '0')}`,
      } as never);

      await expect(service.cancel('tenant-1', 'pt-1', { memberId: 'member-1' })).rejects.toThrow(BadRequestException);
    });
  });
});
