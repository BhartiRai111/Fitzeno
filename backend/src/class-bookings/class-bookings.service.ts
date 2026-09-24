import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service.js';
import { runSerializableTransaction } from '../common/utils/serializable-transaction.util.js';
import { ClassBookingStatus, ClassOccurrenceStatus, MemberStatus, UserRole } from '../generated/prisma/enums.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PaginatedResult } from '../common/dto/pagination-query.dto.js';
import { toClassBookingResponse, type ClassBookingResponseDto } from './dto/class-booking-response.dto.js';
import type { ListClassBookingsQueryDto } from './dto/list-class-bookings-query.dto.js';
import { NOTIFICATION_EVENTS } from '../notifications/events/domain-events.js';

/** How long before class start a member is still allowed to self-cancel a CONFIRMED booking — mirrors the approved frontend's CANCELLATION_WINDOW_HOURS. */
const CANCELLATION_WINDOW_HOURS = 4;

export interface CallerContext {
  id: string;
  role: UserRole;
}

const bookingInclude = {
  classOccurrence: { include: { classSeries: { select: { name: true } } } },
  member: { select: { id: true, firstName: true, lastName: true } },
};

function occurrenceStartsAt(date: Date, startTime: string): Date {
  const [h, m] = startTime.split(':').map(Number);
  const result = new Date(date);
  result.setUTCHours(h, m, 0, 0);
  return result;
}

@Injectable()
export class ClassBookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Books `memberId` onto `classOccurrenceId`, or waitlists them if the
   * class is full. Runs inside a Serializable transaction with bounded
   * retry (see runSerializableTransaction) so two members racing for the
   * last seat can never both end up CONFIRMED. The confirmed/waitlisted
   * event is emitted AFTER the transaction resolves — never from inside
   * the callback, since a retried attempt must never fire a notification
   * for state that was thrown away (see domain-events.ts's own comment).
   */
  async book(tenantId: string, classOccurrenceId: string, memberId: string): Promise<ClassBookingResponseDto> {
    const result = await runSerializableTransaction(this.prisma, async (tx) => {
      const occurrence = await tx.classOccurrence.findFirst({ where: { id: classOccurrenceId, tenantId } });
      if (!occurrence) {
        throw new NotFoundException('Class session not found.');
      }
      if (occurrence.status !== ClassOccurrenceStatus.SCHEDULED) {
        throw new BadRequestException('This class is no longer available to book.');
      }
      if (occurrenceStartsAt(occurrence.date, occurrence.startTime) <= new Date()) {
        throw new BadRequestException('You can\'t book a class that has already started.');
      }

      const member = await tx.member.findFirst({ where: { id: memberId, tenantId } });
      if (!member) {
        throw new NotFoundException('Member not found.');
      }
      if (member.status !== MemberStatus.ACTIVE) {
        throw new BadRequestException('You need an active membership to book classes.');
      }

      const existing = await tx.classBooking.findUnique({
        where: { classOccurrenceId_memberId: { classOccurrenceId, memberId } },
      });
      if (existing && existing.status !== ClassBookingStatus.CANCELLED) {
        throw new ConflictException('You already have a booking for this class.');
      }

      const confirmedCount = await tx.classBooking.count({
        where: { classOccurrenceId, status: ClassBookingStatus.CONFIRMED },
      });
      const newStatus = confirmedCount < occurrence.capacity ? ClassBookingStatus.CONFIRMED : ClassBookingStatus.WAITLISTED;

      const booking = existing
        ? await tx.classBooking.update({
            where: { id: existing.id },
            data: { status: newStatus, bookedAt: new Date(), cancelledAt: null },
            include: bookingInclude,
          })
        : await tx.classBooking.create({
            data: { tenantId, classOccurrenceId, memberId, status: newStatus },
            include: bookingInclude,
          });

      return toClassBookingResponse(booking);
    });

    this.eventEmitter.emit(
      result.status === ClassBookingStatus.CONFIRMED ? NOTIFICATION_EVENTS.BOOKING_CONFIRMED : NOTIFICATION_EVENTS.BOOKING_WAITLISTED,
      {
        tenantId,
        memberId: result.member.id,
        bookingId: result.id,
        classOccurrenceId: result.classOccurrence.id,
        className: result.classOccurrence.name,
        date: result.classOccurrence.date,
        startTime: result.classOccurrence.startTime,
      },
    );
    return result;
  }

  /**
   * Cancels a booking. `caller` undefined means a staff-driven cancellation
   * (no cancellation-window restriction, can cancel anyone's booking). When
   * `caller` is set, the booking must belong to them, and a CONFIRMED
   * booking can only be self-cancelled outside the cancellation window —
   * WAITLISTED bookings can be dropped any time. Promotes the earliest
   * WAITLISTED booking (FIFO) to CONFIRMED when a CONFIRMED seat frees up,
   * inside the same transaction. Only a STAFF-driven cancellation notifies
   * the member — they already know when they cancel their own booking.
   */
  async cancel(tenantId: string, bookingId: string, caller?: { memberId: string }): Promise<ClassBookingResponseDto> {
    const { booking: result, promoted } = await runSerializableTransaction(this.prisma, async (tx) => {
      const booking = await tx.classBooking.findFirst({
        where: { id: bookingId, tenantId },
        include: { classOccurrence: true },
      });
      if (!booking) {
        throw new NotFoundException('Booking not found.');
      }
      if (caller && booking.memberId !== caller.memberId) {
        throw new ForbiddenException("You don't have access to this booking.");
      }
      if (booking.status !== ClassBookingStatus.CONFIRMED && booking.status !== ClassBookingStatus.WAITLISTED) {
        throw new BadRequestException('This booking is already cancelled.');
      }

      if (caller && booking.status === ClassBookingStatus.CONFIRMED) {
        const startsAt = occurrenceStartsAt(booking.classOccurrence.date, booking.classOccurrence.startTime);
        const hoursUntilStart = (startsAt.getTime() - Date.now()) / (1000 * 60 * 60);
        if (hoursUntilStart < CANCELLATION_WINDOW_HOURS) {
          throw new BadRequestException(
            `Bookings can only be cancelled at least ${CANCELLATION_WINDOW_HOURS} hours before the class starts.`,
          );
        }
      }

      const wasConfirmed = booking.status === ClassBookingStatus.CONFIRMED;
      await tx.classBooking.update({
        where: { id: bookingId },
        data: { status: ClassBookingStatus.CANCELLED, cancelledAt: new Date() },
      });

      const promoted = wasConfirmed ? await this.promoteNextWaitlisted(tx, booking.classOccurrenceId) : null;

      const updated = await tx.classBooking.findUniqueOrThrow({ where: { id: bookingId }, include: bookingInclude });
      return { booking: toClassBookingResponse(updated), promoted };
    });

    if (!caller) {
      this.eventEmitter.emit(NOTIFICATION_EVENTS.BOOKING_CANCELLED_BY_STAFF, {
        tenantId,
        memberId: result.member.id,
        bookingId: result.id,
        classOccurrenceId: result.classOccurrence.id,
        className: result.classOccurrence.name,
        date: result.classOccurrence.date,
        startTime: result.classOccurrence.startTime,
      });
    }
    if (promoted) {
      this.eventEmitter.emit(NOTIFICATION_EVENTS.BOOKING_PROMOTED, {
        tenantId,
        memberId: promoted.memberId,
        bookingId: promoted.id,
        classOccurrenceId: result.classOccurrence.id,
        className: result.classOccurrence.name,
        date: result.classOccurrence.date,
        startTime: result.classOccurrence.startTime,
      });
    }
    return result;
  }

  /** Staff override: manually promote a specific waitlisted booking, skipping FIFO order (e.g. for the approved frontend's "Promote to Booked" action). */
  async promote(tenantId: string, bookingId: string): Promise<ClassBookingResponseDto> {
    const result = await runSerializableTransaction(this.prisma, async (tx) => {
      const booking = await tx.classBooking.findFirst({ where: { id: bookingId, tenantId }, include: { classOccurrence: true } });
      if (!booking) {
        throw new NotFoundException('Booking not found.');
      }
      if (booking.status !== ClassBookingStatus.WAITLISTED) {
        throw new BadRequestException('Only a waitlisted booking can be promoted.');
      }
      const confirmedCount = await tx.classBooking.count({
        where: { classOccurrenceId: booking.classOccurrenceId, status: ClassBookingStatus.CONFIRMED },
      });
      if (confirmedCount >= booking.classOccurrence.capacity) {
        throw new BadRequestException('This class is full.');
      }

      const updated = await tx.classBooking.update({
        where: { id: bookingId },
        data: { status: ClassBookingStatus.CONFIRMED, bookedAt: new Date() },
        include: bookingInclude,
      });
      return toClassBookingResponse(updated);
    });

    this.eventEmitter.emit(NOTIFICATION_EVENTS.BOOKING_PROMOTED, {
      tenantId,
      memberId: result.member.id,
      bookingId: result.id,
      classOccurrenceId: result.classOccurrence.id,
      className: result.classOccurrence.name,
      date: result.classOccurrence.date,
      startTime: result.classOccurrence.startTime,
    });
    return result;
  }

  private async promoteNextWaitlisted(tx: Prisma.TransactionClient, classOccurrenceId: string): Promise<{ id: string; memberId: string } | null> {
    const next = await tx.classBooking.findFirst({
      where: { classOccurrenceId, status: ClassBookingStatus.WAITLISTED },
      orderBy: { bookedAt: 'asc' },
    });
    if (next) {
      await tx.classBooking.update({
        where: { id: next.id },
        data: { status: ClassBookingStatus.CONFIRMED, bookedAt: new Date() },
      });
      return { id: next.id, memberId: next.memberId };
    }
    return null;
  }

  async listForMember(tenantId: string, memberId: string, query: ListClassBookingsQueryDto): Promise<PaginatedResult<ClassBookingResponseDto>> {
    return this.list(tenantId, { ...query, memberId, skip: query.skip }, undefined);
  }

  async list(
    tenantId: string,
    query: ListClassBookingsQueryDto,
    caller?: CallerContext,
  ): Promise<PaginatedResult<ClassBookingResponseDto>> {
    const where: Record<string, unknown> = {
      tenantId,
      ...(query.classOccurrenceId ? { classOccurrenceId: query.classOccurrenceId } : {}),
      ...(query.memberId ? { memberId: query.memberId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    if (caller?.role === UserRole.TRAINER) {
      where.classOccurrence = { trainerId: caller.id };
    }

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.classBooking.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { bookedAt: query.sortOrder },
        include: bookingInclude,
      }),
      this.prisma.classBooking.count({ where }),
    ]);

    return new PaginatedResult(items.map(toClassBookingResponse), totalItems, query.page, query.limit);
  }

  /** Staff waitlist view for one class session, FIFO order — matches the approved frontend's Waitlist tab. */
  async waitlistForOccurrence(tenantId: string, classOccurrenceId: string): Promise<ClassBookingResponseDto[]> {
    const occurrence = await this.prisma.classOccurrence.findFirst({ where: { id: classOccurrenceId, tenantId } });
    if (!occurrence) {
      throw new NotFoundException('Class session not found.');
    }
    const items = await this.prisma.classBooking.findMany({
      where: { classOccurrenceId, status: ClassBookingStatus.WAITLISTED },
      orderBy: { bookedAt: 'asc' },
      include: bookingInclude,
    });
    return items.map(toClassBookingResponse);
  }
}
