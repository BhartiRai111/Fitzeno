import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClassBookingsService } from './class-bookings.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

const FUTURE_DATE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const PAST_DATE = new Date(Date.now() - 24 * 60 * 60 * 1000);

function formatUtcTime(date: Date): string {
  return `${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}`;
}

function makeOccurrence(overrides: Record<string, unknown> = {}) {
  return {
    id: 'occ-1',
    tenantId: 'tenant-1',
    date: FUTURE_DATE,
    startTime: '06:00',
    endTime: '06:45',
    status: 'SCHEDULED',
    capacity: 2,
    location: 'Studio A',
    classSeries: { name: 'Sunrise Spin' },
    ...overrides,
  };
}

function makeBookingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'booking-1',
    tenantId: 'tenant-1',
    classOccurrenceId: 'occ-1',
    memberId: 'member-1',
    status: 'CONFIRMED',
    bookedAt: new Date(),
    cancelledAt: null,
    classOccurrence: makeOccurrence(),
    member: { id: 'member-1', firstName: 'Jordan', lastName: 'Smith' },
    ...overrides,
  };
}

describe('ClassBookingsService', () => {
  let prisma: PrismaService;
  let service: ClassBookingsService;

  beforeEach(() => {
    prisma = {
      classOccurrence: { findFirst: vi.fn() },
      member: { findFirst: vi.fn() },
      classBooking: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
      },
      $transaction: vi.fn(async (arg: unknown) =>
        typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(prisma) : Promise.all(arg as Promise<unknown>[]),
      ),
    } as unknown as PrismaService;

    const eventEmitter = { emit: vi.fn() } as unknown as EventEmitter2;
    service = new ClassBookingsService(prisma, eventEmitter);
  });

  describe('book', () => {
    it('confirms the booking when a seat is available', async () => {
      vi.mocked(prisma.classOccurrence.findFirst).mockResolvedValue(makeOccurrence() as never);
      vi.mocked(prisma.member.findFirst).mockResolvedValue({ id: 'member-1', status: 'ACTIVE' } as never);
      vi.mocked(prisma.classBooking.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.classBooking.count).mockResolvedValue(0);
      vi.mocked(prisma.classBooking.create).mockResolvedValue(makeBookingRow({ status: 'CONFIRMED' }) as never);

      const result = await service.book('tenant-1', 'occ-1', 'member-1');

      expect(result.status).toBe('CONFIRMED');
      expect(prisma.classBooking.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'CONFIRMED' }) }),
      );
    });

    it('waitlists the booking when the class is full', async () => {
      vi.mocked(prisma.classOccurrence.findFirst).mockResolvedValue(makeOccurrence({ capacity: 1 }) as never);
      vi.mocked(prisma.member.findFirst).mockResolvedValue({ id: 'member-2', status: 'ACTIVE' } as never);
      vi.mocked(prisma.classBooking.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.classBooking.count).mockResolvedValue(1);
      vi.mocked(prisma.classBooking.create).mockResolvedValue(makeBookingRow({ status: 'WAITLISTED' }) as never);

      const result = await service.book('tenant-1', 'occ-1', 'member-2');

      expect(result.status).toBe('WAITLISTED');
    });

    it('rejects booking a class that has already started', async () => {
      vi.mocked(prisma.classOccurrence.findFirst).mockResolvedValue(makeOccurrence({ date: PAST_DATE, startTime: '00:00' }) as never);

      await expect(service.book('tenant-1', 'occ-1', 'member-1')).rejects.toThrow(BadRequestException);
    });

    it('rejects a member without an active membership', async () => {
      vi.mocked(prisma.classOccurrence.findFirst).mockResolvedValue(makeOccurrence() as never);
      vi.mocked(prisma.member.findFirst).mockResolvedValue({ id: 'member-1', status: 'INACTIVE' } as never);

      await expect(service.book('tenant-1', 'occ-1', 'member-1')).rejects.toThrow(BadRequestException);
    });

    it('rejects a duplicate active booking', async () => {
      vi.mocked(prisma.classOccurrence.findFirst).mockResolvedValue(makeOccurrence() as never);
      vi.mocked(prisma.member.findFirst).mockResolvedValue({ id: 'member-1', status: 'ACTIVE' } as never);
      vi.mocked(prisma.classBooking.findUnique).mockResolvedValue({ id: 'booking-1', status: 'CONFIRMED' } as never);

      await expect(service.book('tenant-1', 'occ-1', 'member-1')).rejects.toThrow(ConflictException);
      expect(prisma.classBooking.create).not.toHaveBeenCalled();
    });

    it('reuses a cancelled row instead of creating a new one on rebook', async () => {
      vi.mocked(prisma.classOccurrence.findFirst).mockResolvedValue(makeOccurrence() as never);
      vi.mocked(prisma.member.findFirst).mockResolvedValue({ id: 'member-1', status: 'ACTIVE' } as never);
      vi.mocked(prisma.classBooking.findUnique).mockResolvedValue({ id: 'booking-1', status: 'CANCELLED' } as never);
      vi.mocked(prisma.classBooking.count).mockResolvedValue(0);
      vi.mocked(prisma.classBooking.update).mockResolvedValue(makeBookingRow({ status: 'CONFIRMED' }) as never);

      await service.book('tenant-1', 'occ-1', 'member-1');

      expect(prisma.classBooking.create).not.toHaveBeenCalled();
      expect(prisma.classBooking.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'booking-1' }, data: expect.objectContaining({ status: 'CONFIRMED' }) }),
      );
    });
  });

  describe('cancel', () => {
    it('throws ForbiddenException when the booking belongs to someone else', async () => {
      vi.mocked(prisma.classBooking.findFirst).mockResolvedValue(makeBookingRow({ memberId: 'other-member' }) as never);

      await expect(service.cancel('tenant-1', 'booking-1', { memberId: 'member-1' })).rejects.toThrow(ForbiddenException);
    });

    it('rejects self-cancelling a CONFIRMED booking inside the cancellation window', async () => {
      const soon = new Date(Date.now() + 60 * 60 * 1000); // 1 hour out — inside the 4-hour window
      vi.mocked(prisma.classBooking.findFirst).mockResolvedValue(
        makeBookingRow({ classOccurrence: makeOccurrence({ date: soon, startTime: formatUtcTime(soon) }) }) as never,
      );

      await expect(service.cancel('tenant-1', 'booking-1', { memberId: 'member-1' })).rejects.toThrow(BadRequestException);
    });

    it('allows self-cancelling a WAITLISTED booking at any time', async () => {
      const soon = new Date(Date.now() + 30 * 60 * 1000);
      vi.mocked(prisma.classBooking.findFirst).mockResolvedValue(
        makeBookingRow({
          status: 'WAITLISTED',
          classOccurrence: makeOccurrence({ date: soon, startTime: formatUtcTime(soon) }),
        }) as never,
      );
      vi.mocked(prisma.classBooking.findMany).mockResolvedValue([]);
      vi.mocked(prisma.classBooking.findUniqueOrThrow).mockResolvedValue(makeBookingRow({ status: 'CANCELLED' }) as never);

      const result = await service.cancel('tenant-1', 'booking-1', { memberId: 'member-1' });
      expect(result.status).toBe('CANCELLED');
    });

    it('promotes the earliest waitlisted booking (FIFO) when a CONFIRMED booking is cancelled', async () => {
      vi.mocked(prisma.classBooking.findFirst)
        .mockResolvedValueOnce(makeBookingRow({ status: 'CONFIRMED' }) as never) // the cancel target
        .mockResolvedValueOnce({ id: 'waitlisted-1', bookedAt: new Date() } as never); // promoteNextWaitlisted's lookup
      vi.mocked(prisma.classBooking.findUniqueOrThrow).mockResolvedValue(makeBookingRow({ status: 'CANCELLED' }) as never);

      await service.cancel('tenant-1', 'booking-1');

      expect(prisma.classBooking.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'waitlisted-1' }, data: expect.objectContaining({ status: 'CONFIRMED' }) }),
      );
    });
  });

  describe('promote', () => {
    it('rejects promoting a non-waitlisted booking', async () => {
      vi.mocked(prisma.classBooking.findFirst).mockResolvedValue(makeBookingRow({ status: 'CONFIRMED' }) as never);

      await expect(service.promote('tenant-1', 'booking-1')).rejects.toThrow(BadRequestException);
    });

    it('rejects promoting into a full class', async () => {
      vi.mocked(prisma.classBooking.findFirst).mockResolvedValue(
        makeBookingRow({ status: 'WAITLISTED', classOccurrence: makeOccurrence({ capacity: 1 }) }) as never,
      );
      vi.mocked(prisma.classBooking.count).mockResolvedValue(1);

      await expect(service.promote('tenant-1', 'booking-1')).rejects.toThrow(BadRequestException);
    });

    it('promotes a waitlisted booking when a seat is free', async () => {
      vi.mocked(prisma.classBooking.findFirst).mockResolvedValue(
        makeBookingRow({ status: 'WAITLISTED', classOccurrence: makeOccurrence({ capacity: 2 }) }) as never,
      );
      vi.mocked(prisma.classBooking.count).mockResolvedValue(1);
      vi.mocked(prisma.classBooking.update).mockResolvedValue(makeBookingRow({ status: 'CONFIRMED' }) as never);

      const result = await service.promote('tenant-1', 'booking-1');
      expect(result.status).toBe('CONFIRMED');
    });
  });
});
