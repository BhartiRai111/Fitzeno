import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service.js';
import { MembersService } from '../members/members.service.js';
import { TrainersService } from '../trainers/trainers.service.js';
import { runSerializableTransaction } from '../common/utils/serializable-transaction.util.js';
import { NOTIFICATION_EVENTS } from '../notifications/events/domain-events.js';
import { ClassBookingStatus, ClassOccurrenceStatus, MemberStatus, PtSessionStatus, UserRole } from '../generated/prisma/enums.js';
import { Prisma } from '../generated/prisma/client.js';
import type { DayOfWeek, TrainerAvailability } from '../generated/prisma/client.js';
import type { CreatePtSessionDto } from './dto/create-pt-session.dto.js';
import type { ReschedulePtSessionDto } from './dto/reschedule-pt-session.dto.js';
import type { ListPtSessionsQueryDto } from './dto/list-pt-sessions-query.dto.js';
import { PaginatedResult } from '../common/dto/pagination-query.dto.js';
import { toPtSessionResponse, type PtSessionResponseDto, type FreeSlotDto } from './dto/pt-session-response.dto.js';

/** Mirrors ClassBookingsService's own — self-cancelling a PT session follows the same notice period as a class booking. */
const CANCELLATION_WINDOW_HOURS = 4;

const DAY_BY_INDEX: DayOfWeek[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export interface CallerContext {
  id: string;
  role: UserRole;
}

const sessionInclude = {
  trainer: { select: { id: true, firstName: true, lastName: true } },
  member: { select: { id: true, firstName: true, lastName: true } },
};

function timesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor((total / 60) % 24)
    .toString()
    .padStart(2, '0');
  const mm = (total % 60).toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

function toUtcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function parseDateOnly(value: string): Date {
  return toUtcMidnight(new Date(value));
}

function startsAt(date: Date, time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const result = new Date(date);
  result.setUTCHours(h, m, 0, 0);
  return result;
}

/** Subtracts a list of busy [start,end) intervals from one window, returning the remaining free sub-ranges. */
function subtractBusyIntervals(window: { startTime: string; endTime: string }, busy: { startTime: string; endTime: string }[]): FreeSlotDto[] {
  const relevant = busy
    .filter((b) => timesOverlap(window.startTime, window.endTime, b.startTime, b.endTime))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const free: FreeSlotDto[] = [];
  let cursor = window.startTime;
  for (const b of relevant) {
    const clampedStart = b.startTime > window.startTime ? b.startTime : window.startTime;
    if (clampedStart > cursor) {
      free.push({ startTime: cursor, endTime: clampedStart });
    }
    if (b.endTime > cursor) {
      cursor = b.endTime < window.endTime ? b.endTime : window.endTime;
    }
  }
  if (cursor < window.endTime) {
    free.push({ startTime: cursor, endTime: window.endTime });
  }
  return free;
}

@Injectable()
export class PtSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membersService: MembersService,
    private readonly trainersService: TrainersService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getAvailableSlots(tenantId: string, trainerId: string, dateStr: string): Promise<FreeSlotDto[]> {
    const trainer = await this.trainersService.getActiveBookableTrainer(tenantId, trainerId);
    const date = parseDateOnly(dateStr);
    const dayOfWeek = DAY_BY_INDEX[date.getUTCDay()];
    const windows = trainer.availability.filter((a: TrainerAvailability) => a.dayOfWeek === dayOfWeek);
    if (windows.length === 0) {
      return [];
    }

    const [occurrences, ptSessions] = await Promise.all([
      this.prisma.classOccurrence.findMany({ where: { tenantId, trainerId, date, status: ClassOccurrenceStatus.SCHEDULED } }),
      this.prisma.personalTrainingSession.findMany({ where: { tenantId, trainerId, date, status: PtSessionStatus.CONFIRMED } }),
    ]);
    const busy = [
      ...occurrences.map((o) => ({ startTime: o.startTime, endTime: o.endTime })),
      ...ptSessions.map((s) => ({ startTime: s.startTime, endTime: addMinutesToTime(s.startTime, s.durationMinutes) })),
    ];

    return windows
      .flatMap((w) => subtractBusyIntervals({ startTime: w.startTime, endTime: w.endTime }, busy))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  async book(tenantId: string, trainerId: string, memberId: string, dto: CreatePtSessionDto): Promise<PtSessionResponseDto> {
    const result = await runSerializableTransaction(this.prisma, async (tx) => {
      const trainer = await this.trainersService.getActiveBookableTrainer(tenantId, trainerId);
      const date = parseDateOnly(dto.date);
      const endTime = addMinutesToTime(dto.startTime, dto.durationMinutes);

      if (startsAt(date, dto.startTime) <= new Date()) {
        throw new BadRequestException('You can\'t book a session in the past.');
      }

      const dayOfWeek = DAY_BY_INDEX[date.getUTCDay()];
      const withinAvailability = trainer.availability.some(
        (w: TrainerAvailability) => w.dayOfWeek === dayOfWeek && w.startTime <= dto.startTime && endTime <= w.endTime,
      );
      if (!withinAvailability) {
        throw new BadRequestException("This time is outside the trainer's availability.");
      }

      const member = await tx.member.findFirst({ where: { id: memberId, tenantId } });
      if (!member) {
        throw new NotFoundException('Member not found.');
      }
      if (member.status !== MemberStatus.ACTIVE) {
        throw new BadRequestException('You need an active membership to book personal training.');
      }

      await this.assertTrainerFree(tx, tenantId, trainerId, date, dto.startTime, endTime);
      await this.assertMemberFree(tx, tenantId, memberId, date, dto.startTime, endTime);

      const session = await tx.personalTrainingSession.create({
        data: {
          tenantId,
          trainerId,
          memberId,
          date,
          startTime: dto.startTime,
          durationMinutes: dto.durationMinutes,
          notes: dto.notes,
        },
        include: sessionInclude,
      });
      return toPtSessionResponse(session);
    });

    this.eventEmitter.emit(NOTIFICATION_EVENTS.PT_SESSION_BOOKED, {
      tenantId,
      sessionId: result.id,
      memberId: result.member.id,
      trainerId: result.trainer.id,
      date: result.date,
      startTime: result.startTime,
    });
    return result;
  }

  async reschedule(tenantId: string, id: string, dto: ReschedulePtSessionDto, caller?: { memberId: string }): Promise<PtSessionResponseDto> {
    const result = await runSerializableTransaction(this.prisma, async (tx) => {
      const existing = await tx.personalTrainingSession.findFirst({ where: { id, tenantId } });
      if (!existing) {
        throw new NotFoundException('Personal training session not found.');
      }
      if (caller && existing.memberId !== caller.memberId) {
        throw new ForbiddenException("You don't have access to this session.");
      }
      if (existing.status !== PtSessionStatus.CONFIRMED) {
        throw new BadRequestException('Only a confirmed session can be rescheduled.');
      }

      const date = dto.date ? parseDateOnly(dto.date) : existing.date;
      const startTime = dto.startTime ?? existing.startTime;
      const durationMinutes = dto.durationMinutes ?? existing.durationMinutes;
      const endTime = addMinutesToTime(startTime, durationMinutes);

      if (startsAt(date, startTime) <= new Date()) {
        throw new BadRequestException('You can\'t reschedule to a time in the past.');
      }

      const trainer = await this.trainersService.getActiveBookableTrainer(tenantId, existing.trainerId);
      const dayOfWeek = DAY_BY_INDEX[date.getUTCDay()];
      const withinAvailability = trainer.availability.some(
        (w: TrainerAvailability) => w.dayOfWeek === dayOfWeek && w.startTime <= startTime && endTime <= w.endTime,
      );
      if (!withinAvailability) {
        throw new BadRequestException("This time is outside the trainer's availability.");
      }

      await this.assertTrainerFree(tx, tenantId, existing.trainerId, date, startTime, endTime, id);
      await this.assertMemberFree(tx, tenantId, existing.memberId, date, startTime, endTime, id);

      const session = await tx.personalTrainingSession.update({
        where: { id },
        data: { date, startTime, durationMinutes },
        include: sessionInclude,
      });
      return toPtSessionResponse(session);
    });

    this.eventEmitter.emit(NOTIFICATION_EVENTS.PT_SESSION_RESCHEDULED, {
      tenantId,
      sessionId: result.id,
      memberId: result.member.id,
      trainerId: result.trainer.id,
      date: result.date,
      startTime: result.startTime,
    });
    return result;
  }

  /** Notifies whichever party did NOT initiate the cancellation — see NotificationsEventListener.onPtSessionCancelled. */
  async cancel(tenantId: string, id: string, caller?: { memberId: string }): Promise<PtSessionResponseDto> {
    const existing = await this.prisma.personalTrainingSession.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new NotFoundException('Personal training session not found.');
    }
    if (caller && existing.memberId !== caller.memberId) {
      throw new ForbiddenException("You don't have access to this session.");
    }
    if (existing.status !== PtSessionStatus.CONFIRMED) {
      throw new BadRequestException('This session is already cancelled.');
    }
    if (caller) {
      const hoursUntilStart = (startsAt(existing.date, existing.startTime).getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursUntilStart < CANCELLATION_WINDOW_HOURS) {
        throw new BadRequestException(
          `Sessions can only be cancelled at least ${CANCELLATION_WINDOW_HOURS} hours before they start.`,
        );
      }
    }

    const session = await this.prisma.personalTrainingSession.update({
      where: { id },
      data: { status: PtSessionStatus.CANCELLED },
      include: sessionInclude,
    });

    this.eventEmitter.emit(NOTIFICATION_EVENTS.PT_SESSION_CANCELLED, {
      tenantId,
      sessionId: session.id,
      memberId: session.member.id,
      trainerId: session.trainer.id,
      date: session.date,
      startTime: session.startTime,
      cancelledBy: caller ? 'member' : 'staff',
    });
    return toPtSessionResponse(session);
  }

  async listForMember(tenantId: string, memberId: string, query: ListPtSessionsQueryDto): Promise<PaginatedResult<PtSessionResponseDto>> {
    return this.list(tenantId, { ...query, memberId, skip: query.skip });
  }

  async list(tenantId: string, query: ListPtSessionsQueryDto, caller?: CallerContext): Promise<PaginatedResult<PtSessionResponseDto>> {
    const where = {
      tenantId,
      ...(query.trainerId ? { trainerId: query.trainerId } : {}),
      ...(query.memberId ? { memberId: query.memberId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.from || query.to
        ? {
            date: {
              ...(query.from ? { gte: parseDateOnly(query.from) } : {}),
              ...(query.to ? { lte: parseDateOnly(query.to) } : {}),
            },
          }
        : {}),
      ...(caller?.role === UserRole.TRAINER ? { trainerId: caller.id } : {}),
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.personalTrainingSession.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: [{ date: query.sortOrder }, { startTime: query.sortOrder }],
        include: sessionInclude,
      }),
      this.prisma.personalTrainingSession.count({ where }),
    ]);

    return new PaginatedResult(items.map(toPtSessionResponse), totalItems, query.page, query.limit);
  }

  private async assertTrainerFree(
    tx: Prisma.TransactionClient,
    tenantId: string,
    trainerId: string,
    date: Date,
    startTime: string,
    endTime: string,
    excludeSessionId?: string,
  ): Promise<void> {
    const [occurrences, ptSessions] = await Promise.all([
      tx.classOccurrence.findMany({ where: { tenantId, trainerId, date, status: ClassOccurrenceStatus.SCHEDULED } }),
      tx.personalTrainingSession.findMany({
        where: { tenantId, trainerId, date, status: PtSessionStatus.CONFIRMED, ...(excludeSessionId ? { id: { not: excludeSessionId } } : {}) },
      }),
    ]);
    const occurrenceConflict = occurrences.some((o) => timesOverlap(startTime, endTime, o.startTime, o.endTime));
    const ptConflict = ptSessions.some((s) => timesOverlap(startTime, endTime, s.startTime, addMinutesToTime(s.startTime, s.durationMinutes)));
    if (occurrenceConflict || ptConflict) {
      throw new ConflictException('This trainer already has something booked at this time.');
    }
  }

  private async assertMemberFree(
    tx: Prisma.TransactionClient,
    tenantId: string,
    memberId: string,
    date: Date,
    startTime: string,
    endTime: string,
    excludeSessionId?: string,
  ): Promise<void> {
    const [bookings, ptSessions] = await Promise.all([
      tx.classBooking.findMany({
        where: { tenantId, memberId, status: ClassBookingStatus.CONFIRMED, classOccurrence: { date } },
        include: { classOccurrence: { select: { startTime: true, endTime: true } } },
      }),
      tx.personalTrainingSession.findMany({
        where: { tenantId, memberId, date, status: PtSessionStatus.CONFIRMED, ...(excludeSessionId ? { id: { not: excludeSessionId } } : {}) },
      }),
    ]);
    const bookingConflict = bookings.some((b) =>
      timesOverlap(startTime, endTime, b.classOccurrence.startTime, b.classOccurrence.endTime),
    );
    const ptConflict = ptSessions.some((s) => timesOverlap(startTime, endTime, s.startTime, addMinutesToTime(s.startTime, s.durationMinutes)));
    if (bookingConflict || ptConflict) {
      throw new ConflictException('You already have something booked at this time.');
    }
  }
}
