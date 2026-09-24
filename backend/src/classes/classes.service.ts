import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { ClassOccurrenceStatus, ClassSeriesStatus, DayOfWeek, UserRole } from '../generated/prisma/enums.js';
import { NOTIFICATION_EVENTS } from '../notifications/events/domain-events.js';
import type { CreateClassSeriesDto } from './dto/create-class-series.dto.js';
import type { UpdateClassSeriesDto } from './dto/update-class-series.dto.js';
import type { UpdateClassOccurrenceDto } from './dto/update-class-occurrence.dto.js';
import type { ListClassSeriesQueryDto } from './dto/list-class-series-query.dto.js';
import type { ListClassOccurrencesQueryDto } from './dto/list-class-occurrences-query.dto.js';
import { PaginatedResult } from '../common/dto/pagination-query.dto.js';
import { toClassSeriesResponse, type ClassSeriesResponseDto } from './dto/class-series-response.dto.js';
import { toClassOccurrenceResponse, type ClassOccurrenceResponseDto } from './dto/class-occurrence-response.dto.js';

/** How far ahead ClassOccurrence rows are ever materialized — bounds both generation and browsing. */
const HORIZON_DAYS = 56;

const DAY_INDEX: Record<DayOfWeek, number> = {
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
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

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function parseDateOnly(value: string): Date {
  return toUtcMidnight(new Date(value));
}

function todayUtc(): Date {
  return toUtcMidnight(new Date());
}

interface SeriesRecurrenceInput {
  dayOfWeek: DayOfWeek;
  startTime: string;
  startDate: Date;
  endDate: Date | null;
}

/** Every date on `series.dayOfWeek` within [max(series.startDate, from), min(series.endDate ?? to, to)]. */
function datesForSeries(series: SeriesRecurrenceInput, from: Date, to: Date): Date[] {
  const rangeStartMs = Math.max(series.startDate.getTime(), from.getTime());
  const rangeEndMs = Math.min(series.endDate ? series.endDate.getTime() : to.getTime(), to.getTime());
  if (rangeStartMs > rangeEndMs) {
    return [];
  }

  const targetDow = DAY_INDEX[series.dayOfWeek];
  const cursor = toUtcMidnight(new Date(rangeStartMs));
  while (cursor.getUTCDay() !== targetDow) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const dates: Date[] = [];
  while (cursor.getTime() <= rangeEndMs) {
    dates.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }
  return dates;
}

/** Do two [startDate, endDate ?? +inf] windows overlap at all? */
function dateWindowsOverlap(aStart: Date, aEnd: Date | null, bStart: Date, bEnd: Date | null): boolean {
  const aEndMs = aEnd ? aEnd.getTime() : Infinity;
  const bEndMs = bEnd ? bEnd.getTime() : Infinity;
  return aStart.getTime() <= bEndMs && bStart.getTime() <= aEndMs;
}

const occurrenceInclude = {
  classSeries: { select: { name: true, category: true } },
  trainer: { select: { id: true, firstName: true, lastName: true } },
  bookings: { select: { status: true, memberId: true } },
};

const seriesInclude = {
  trainer: { select: { id: true, firstName: true, lastName: true } },
};

@Injectable()
export class ClassesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private async assertTrainerUser(tenantId: string, trainerId: string): Promise<void> {
    const user = await this.usersService.findByIdInTenant(tenantId, trainerId);
    if (user.role !== UserRole.TRAINER) {
      throw new BadRequestException('trainerId must reference a trainer in this gym.');
    }
  }

  /** Pattern-level conflict check for ClassSeries: same trainer, same weekday, overlapping time and date windows. */
  private async assertNoSeriesConflict(
    tenantId: string,
    trainerId: string,
    input: { dayOfWeek: DayOfWeek; startTime: string; endTime: string; startDate: Date; endDate: Date | null },
    excludeSeriesId?: string,
  ): Promise<void> {
    const others = await this.prisma.classSeries.findMany({
      where: {
        tenantId,
        trainerId,
        dayOfWeek: input.dayOfWeek,
        status: ClassSeriesStatus.ACTIVE,
        ...(excludeSeriesId ? { id: { not: excludeSeriesId } } : {}),
      },
    });

    const conflict = others.some((other) => {
      const otherEnd = addMinutesToTime(other.startTime, other.durationMinutes);
      return (
        timesOverlap(input.startTime, input.endTime, other.startTime, otherEnd) &&
        dateWindowsOverlap(input.startDate, input.endDate, other.startDate, other.endDate)
      );
    });

    if (conflict) {
      throw new ConflictException('This trainer already has another class scheduled that overlaps this day and time.');
    }
  }

  /** Specific-date conflict check: other ClassOccurrences AND PersonalTrainingSessions for this trainer on this date. */
  private async assertNoOccurrenceDateConflict(
    tenantId: string,
    trainerId: string,
    date: Date,
    startTime: string,
    endTime: string,
    excludeOccurrenceId?: string,
  ): Promise<void> {
    const [otherOccurrences, ptSessions] = await Promise.all([
      this.prisma.classOccurrence.findMany({
        where: {
          tenantId,
          trainerId,
          date,
          status: ClassOccurrenceStatus.SCHEDULED,
          ...(excludeOccurrenceId ? { id: { not: excludeOccurrenceId } } : {}),
        },
      }),
      this.prisma.personalTrainingSession.findMany({
        where: { tenantId, trainerId, date, status: 'CONFIRMED' },
      }),
    ]);

    const occurrenceConflict = otherOccurrences.some((o) => timesOverlap(startTime, endTime, o.startTime, o.endTime));
    const ptConflict = ptSessions.some((s) =>
      timesOverlap(startTime, endTime, s.startTime, addMinutesToTime(s.startTime, s.durationMinutes)),
    );

    if (occurrenceConflict || ptConflict) {
      throw new ConflictException('This trainer already has a class or personal training session that overlaps this date and time.');
    }
  }

  // ---------------------------------------------------------------------
  // ClassSeries
  // ---------------------------------------------------------------------

  async createSeries(tenantId: string, dto: CreateClassSeriesDto): Promise<ClassSeriesResponseDto> {
    await this.assertTrainerUser(tenantId, dto.trainerId);

    const startDate = dto.startDate ? parseDateOnly(dto.startDate) : todayUtc();
    const endDate = dto.endDate ? parseDateOnly(dto.endDate) : null;
    if (endDate && endDate < startDate) {
      throw new BadRequestException('endDate cannot be before startDate.');
    }
    const endTime = addMinutesToTime(dto.startTime, dto.durationMinutes);

    await this.assertNoSeriesConflict(tenantId, dto.trainerId, {
      dayOfWeek: dto.dayOfWeek,
      startTime: dto.startTime,
      endTime,
      startDate,
      endDate,
    });

    const series = await this.prisma.classSeries.create({
      data: {
        tenantId,
        name: dto.name,
        category: dto.category,
        description: dto.description,
        trainerId: dto.trainerId,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        durationMinutes: dto.durationMinutes,
        capacity: dto.capacity,
        location: dto.location,
        startDate,
        endDate,
      },
      include: seriesInclude,
    });
    return toClassSeriesResponse(series);
  }

  async findSeriesByIdInTenant(tenantId: string, id: string): Promise<ClassSeriesResponseDto> {
    const series = await this.prisma.classSeries.findFirst({ where: { id, tenantId }, include: seriesInclude });
    if (!series) {
      throw new NotFoundException('Class not found.');
    }
    return toClassSeriesResponse(series);
  }

  async updateSeries(tenantId: string, id: string, dto: UpdateClassSeriesDto): Promise<ClassSeriesResponseDto> {
    const existing = await this.prisma.classSeries.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new NotFoundException('Class not found.');
    }
    if (existing.status === ClassSeriesStatus.CANCELLED) {
      throw new BadRequestException('This class has been cancelled and can no longer be edited.');
    }

    const trainerId = dto.trainerId ?? existing.trainerId;
    if (dto.trainerId) {
      await this.assertTrainerUser(tenantId, dto.trainerId);
    }
    const dayOfWeek = dto.dayOfWeek ?? existing.dayOfWeek;
    const startTime = dto.startTime ?? existing.startTime;
    const durationMinutes = dto.durationMinutes ?? existing.durationMinutes;
    const endDate = dto.endDate !== undefined ? parseDateOnly(dto.endDate) : existing.endDate;
    if (endDate && endDate < existing.startDate) {
      throw new BadRequestException('endDate cannot be before startDate.');
    }

    const scheduleChanged = dto.trainerId || dto.dayOfWeek || dto.startTime || dto.durationMinutes !== undefined;
    if (scheduleChanged) {
      await this.assertNoSeriesConflict(
        tenantId,
        trainerId,
        {
          dayOfWeek,
          startTime,
          endTime: addMinutesToTime(startTime, durationMinutes),
          startDate: existing.startDate,
          endDate,
        },
        id,
      );
    }

    const series = await this.prisma.classSeries.update({
      where: { id },
      data: {
        name: dto.name,
        category: dto.category,
        description: dto.description,
        trainerId: dto.trainerId,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        durationMinutes: dto.durationMinutes,
        capacity: dto.capacity,
        location: dto.location,
        ...(dto.endDate !== undefined ? { endDate } : {}),
      },
      include: seriesInclude,
    });
    return toClassSeriesResponse(series);
  }

  async cancelSeries(tenantId: string, id: string, reason?: string): Promise<ClassSeriesResponseDto> {
    const existing = await this.prisma.classSeries.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new NotFoundException('Class not found.');
    }
    if (existing.status === ClassSeriesStatus.CANCELLED) {
      throw new BadRequestException('This class has already been cancelled.');
    }

    const today = todayUtc();
    const cancelledReason = reason ?? 'Class series cancelled.';

    const [series] = await this.prisma.$transaction([
      this.prisma.classSeries.update({ where: { id }, data: { status: ClassSeriesStatus.CANCELLED }, include: seriesInclude }),
      this.prisma.classOccurrence.updateMany({
        where: { classSeriesId: id, status: ClassOccurrenceStatus.SCHEDULED, date: { gte: today } },
        data: { status: ClassOccurrenceStatus.CANCELLED, cancelledReason },
      }),
      this.prisma.classBooking.updateMany({
        where: {
          status: { in: ['CONFIRMED', 'WAITLISTED'] },
          classOccurrence: { classSeriesId: id, date: { gte: today } },
        },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      }),
    ]);

    return toClassSeriesResponse(series);
  }

  async listSeries(tenantId: string, query: ListClassSeriesQueryDto): Promise<PaginatedResult<ClassSeriesResponseDto>> {
    const where = {
      tenantId,
      ...(query.trainerId ? { trainerId: query.trainerId } : {}),
      ...(query.category ? { category: { equals: query.category, mode: 'insensitive' as const } } : {}),
      ...(query.dayOfWeek ? { dayOfWeek: query.dayOfWeek } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' as const } } : {}),
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.classSeries.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: query.sortOrder },
        include: seriesInclude,
      }),
      this.prisma.classSeries.count({ where }),
    ]);

    return new PaginatedResult(items.map(toClassSeriesResponse), totalItems, query.page, query.limit);
  }

  // ---------------------------------------------------------------------
  // ClassOccurrence
  // ---------------------------------------------------------------------

  /** Idempotent — safe to call on every browse/list request. */
  async ensureOccurrencesGenerated(tenantId: string, from: Date, to: Date): Promise<void> {
    const activeSeries = await this.prisma.classSeries.findMany({
      where: {
        tenantId,
        status: ClassSeriesStatus.ACTIVE,
        startDate: { lte: to },
        OR: [{ endDate: null }, { endDate: { gte: from } }],
      },
    });

    for (const series of activeSeries) {
      const dates = datesForSeries(series, from, to);
      if (dates.length === 0) {
        continue;
      }
      await this.prisma.classOccurrence.createMany({
        data: dates.map((date) => ({
          tenantId,
          classSeriesId: series.id,
          date,
          startTime: series.startTime,
          endTime: addMinutesToTime(series.startTime, series.durationMinutes),
          trainerId: series.trainerId,
          location: series.location,
          capacity: series.capacity,
        })),
        skipDuplicates: true,
      });
    }
  }

  async listOccurrences(
    tenantId: string,
    query: ListClassOccurrencesQueryDto,
    callerMemberId?: string,
  ): Promise<ClassOccurrenceResponseDto[]> {
    const from = query.from ? parseDateOnly(query.from) : todayUtc();
    const maxTo = addDays(todayUtc(), HORIZON_DAYS);
    const requestedTo = query.to ? parseDateOnly(query.to) : addDays(from, HORIZON_DAYS);
    const to = requestedTo.getTime() > maxTo.getTime() ? maxTo : requestedTo;
    if (from > to) {
      throw new BadRequestException('from must be before to.');
    }

    await this.ensureOccurrencesGenerated(tenantId, from, to);

    const occurrences = await this.prisma.classOccurrence.findMany({
      where: {
        tenantId,
        date: { gte: from, lte: to },
        ...(query.trainerId ? { trainerId: query.trainerId } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.category ? { classSeries: { category: { equals: query.category, mode: 'insensitive' as const } } } : {}),
      },
      include: occurrenceInclude,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    return occurrences.map((o) => toClassOccurrenceResponse(o, callerMemberId));
  }

  async findOccurrenceByIdInTenant(tenantId: string, id: string, callerMemberId?: string): Promise<ClassOccurrenceResponseDto> {
    const occurrence = await this.prisma.classOccurrence.findFirst({
      where: { id, tenantId },
      include: occurrenceInclude,
    });
    if (!occurrence) {
      throw new NotFoundException('Class session not found.');
    }
    return toClassOccurrenceResponse(occurrence, callerMemberId);
  }

  async updateOccurrence(tenantId: string, id: string, dto: UpdateClassOccurrenceDto): Promise<ClassOccurrenceResponseDto> {
    const existing = await this.prisma.classOccurrence.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new NotFoundException('Class session not found.');
    }
    if (existing.status !== ClassOccurrenceStatus.SCHEDULED) {
      throw new BadRequestException('Only a scheduled class session can be edited.');
    }

    if (dto.capacity !== undefined) {
      const confirmedCount = await this.prisma.classBooking.count({ where: { classOccurrenceId: id, status: 'CONFIRMED' } });
      if (dto.capacity < confirmedCount) {
        throw new BadRequestException(`capacity cannot be set below the ${confirmedCount} member(s) already confirmed.`);
      }
    }

    const trainerId = dto.trainerId ?? existing.trainerId;
    const startTime = dto.startTime ?? existing.startTime;
    const endTime = dto.endTime ?? existing.endTime;
    if (startTime >= endTime) {
      throw new BadRequestException('endTime must be after startTime.');
    }

    if (dto.trainerId) {
      await this.assertTrainerUser(tenantId, dto.trainerId);
    }
    if (dto.trainerId || dto.startTime || dto.endTime) {
      await this.assertNoOccurrenceDateConflict(tenantId, trainerId, existing.date, startTime, endTime, id);
    }

    // A schedule-relevant change (time or trainer) is what earns a
    // reschedule notification — a capacity/location-only edit doesn't
    // change when/who a booked member or trainer needs to show up, so it
    // fires nothing (see the task's own "avoid notification spam" guidance).
    const isReschedule = dto.trainerId !== undefined || dto.startTime !== undefined || dto.endTime !== undefined;

    const occurrence = await this.prisma.classOccurrence.update({
      where: { id },
      data: {
        trainerId: dto.trainerId,
        startTime: dto.startTime,
        endTime: dto.endTime,
        location: dto.location,
        capacity: dto.capacity,
      },
      include: occurrenceInclude,
    });

    if (isReschedule) {
      const affectedMemberIds = occurrence.bookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'WAITLISTED').map((b) => b.memberId);
      const trainerIds = [...new Set([existing.trainerId, occurrence.trainerId])];
      this.eventEmitter.emit(NOTIFICATION_EVENTS.CLASS_OCCURRENCE_RESCHEDULED, {
        tenantId,
        classOccurrenceId: occurrence.id,
        className: occurrence.classSeries.name,
        date: occurrence.date,
        startTime: occurrence.startTime,
        trainerIds,
        affectedMemberIds,
      });
    }
    return toClassOccurrenceResponse(occurrence);
  }

  async cancelOccurrence(tenantId: string, id: string, reason?: string): Promise<ClassOccurrenceResponseDto> {
    const existing = await this.prisma.classOccurrence.findFirst({
      where: { id, tenantId },
      include: { classSeries: { select: { name: true } }, bookings: { where: { status: { in: ['CONFIRMED', 'WAITLISTED'] } }, select: { memberId: true } } },
    });
    if (!existing) {
      throw new NotFoundException('Class session not found.');
    }
    if (existing.status === ClassOccurrenceStatus.CANCELLED) {
      throw new BadRequestException('This class session has already been cancelled.');
    }

    const [occurrence] = await this.prisma.$transaction([
      this.prisma.classOccurrence.update({
        where: { id },
        data: { status: ClassOccurrenceStatus.CANCELLED, cancelledReason: reason ?? null },
        include: occurrenceInclude,
      }),
      this.prisma.classBooking.updateMany({
        where: { classOccurrenceId: id, status: { in: ['CONFIRMED', 'WAITLISTED'] } },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      }),
    ]);

    this.eventEmitter.emit(NOTIFICATION_EVENTS.CLASS_OCCURRENCE_CANCELLED, {
      tenantId,
      classOccurrenceId: occurrence.id,
      className: existing.classSeries.name,
      date: occurrence.date,
      startTime: occurrence.startTime,
      trainerId: existing.trainerId,
      affectedMemberIds: existing.bookings.map((b) => b.memberId),
      reason,
    });
    return toClassOccurrenceResponse(occurrence);
  }
}
