import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service.js';
import { MembersService } from '../members/members.service.js';
import { MembershipsService } from '../memberships/memberships.service.js';
import { TokenService } from '../auth/token.service.js';
import { CheckInMethod, MemberStatus } from '../generated/prisma/enums.js';
import type { Member } from '../generated/prisma/client.js';
import { PaginatedResult } from '../common/dto/pagination-query.dto.js';
import { NOTIFICATION_EVENTS } from '../notifications/events/domain-events.js';
import {
  toCheckInResponse,
  CHECK_IN_DENIAL_MESSAGES,
  type CheckInResponseDto,
  type CheckInAttemptResponseDto,
  type CheckInStatusResponseDto,
  type CheckInTokenResponseDto,
  type TodayAttendanceResponseDto,
  type AttendanceStatsPointDto,
  type InactiveMemberResponseDto,
  type CheckInDenialReason,
  type CheckInWithMember,
} from './dto/check-in-response.dto.js';
import type { ListAttendanceQueryDto } from './dto/list-attendance-query.dto.js';
import type { AttendanceStatsQueryDto } from './dto/attendance-stats-query.dto.js';

const checkInInclude = {
  member: { select: { id: true, firstName: true, lastName: true } },
};

function parseDateOnly(value: string): Date {
  const d = new Date(value);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function daysBetween(from: Date, to: Date): number {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

/**
 * The gym-wide CHECK-IN half of attendance — general visits, independent of
 * any class/PT booking. See the schema's own phase-level comment for why
 * class/PT attendance is deliberately NOT handled here (it's a status
 * transition on ClassBooking/PersonalTrainingSession instead — see
 * ClassBookingsService.markAttendance / PtSessionsService.markAttendance).
 */
@Injectable()
export class AttendanceService {
  /**
   * How long an issued QR check-in token stays redeemable. Short enough
   * that a screenshotted/relayed code is worthless within seconds of
   * leaving this window, long enough for a member to present their phone
   * to a reader — see CheckInToken's own schema comment.
   */
  static readonly CHECK_IN_TOKEN_TTL_SECONDS = 45;

  constructor(
    private readonly prisma: PrismaService,
    private readonly membersService: MembersService,
    private readonly membershipsService: MembershipsService,
    private readonly tokenService: TokenService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ---------------------------------------------------------------------
  // Eligibility
  // ---------------------------------------------------------------------

  /**
   * Whether `member` may check in right now — null means eligible. Checks
   * the member's own business status first (an owner can mark a member
   * INACTIVE for reasons unrelated to billing, e.g. a ban), then their
   * actual current membership period via MembershipsService — the same
   * effective-status logic (PENDING/ACTIVE/EXPIRED/FROZEN/CANCELLED) the
   * approved frontend's own membership block already uses, now backed by
   * real data instead of mock state.
   */
  private async checkEligibility(tenantId: string, member: Member): Promise<CheckInDenialReason | null> {
    if (member.status !== MemberStatus.ACTIVE) {
      return 'MEMBER_INACTIVE';
    }
    const current = await this.membershipsService.getCurrentForMember(tenantId, member.id);
    if (!current) {
      return 'NO_MEMBERSHIP';
    }
    switch (current.effectiveStatus) {
      case 'ACTIVE':
        return null;
      case 'EXPIRED':
        return 'MEMBERSHIP_EXPIRED';
      case 'FROZEN':
        return 'MEMBERSHIP_FROZEN';
      case 'CANCELLED':
        return 'MEMBERSHIP_CANCELLED';
      case 'PENDING':
        // A membership exists but hasn't started yet — from a check-in
        // standpoint that's the same as not having one today.
        return 'NO_MEMBERSHIP';
    }
  }

  // ---------------------------------------------------------------------
  // Check-in / check-out
  // ---------------------------------------------------------------------

  /**
   * The single entry point every check-in path (self, staff manual/kiosk,
   * QR token redemption) funnels through. Never trusts a memberId without
   * first re-verifying it belongs to THIS tenant (getMemberInTenant is
   * tenant-scoped — a cross-gym id 404s exactly like every other module's
   * lookup) and re-checking eligibility fresh on every call rather than
   * caching it — a membership can expire between two check-ins on the same
   * day. A denial is a normal 200 business outcome, not an HTTP error (see
   * CheckInAttemptResponseDto's own comment); only a genuinely invalid
   * request (unknown member, bad token) is a real error.
   */
  async performCheckIn(
    tenantId: string,
    memberId: string,
    method: CheckInMethod,
    recordedByUserId: string | null,
  ): Promise<CheckInAttemptResponseDto> {
    const member = await this.membersService.getMemberInTenant(tenantId, memberId);

    const denialReason = await this.checkEligibility(tenantId, member);
    if (denialReason) {
      this.eventEmitter.emit(NOTIFICATION_EVENTS.CHECK_IN_DENIED, {
        tenantId,
        memberId: member.id,
        memberName: `${member.firstName} ${member.lastName}`,
        reason: denialReason,
      });
      return { outcome: 'DENIED', denialReason, message: CHECK_IN_DENIAL_MESSAGES[denialReason], checkIn: null };
    }

    const open = await this.prisma.checkIn.findFirst({
      where: { tenantId, memberId, checkOutAt: null },
      orderBy: { checkInAt: 'desc' },
      include: checkInInclude,
    });
    if (open) {
      return {
        outcome: 'ALREADY_CHECKED_IN',
        denialReason: null,
        message: 'Already checked in — check out first to start a new visit.',
        checkIn: toCheckInResponse(open),
      };
    }

    const created = await this.prisma.checkIn.create({
      data: { tenantId, memberId, method, recordedByUserId },
      include: checkInInclude,
    });
    return { outcome: 'CHECKED_IN', denialReason: null, message: "You're checked in!", checkIn: toCheckInResponse(created) };
  }

  /** Checks out the caller's own currently-open visit, if any. */
  async checkOutSelf(tenantId: string, memberId: string): Promise<CheckInResponseDto> {
    const open = await this.prisma.checkIn.findFirst({
      where: { tenantId, memberId, checkOutAt: null },
      orderBy: { checkInAt: 'desc' },
      include: checkInInclude,
    });
    if (!open) {
      throw new BadRequestException("You don't have an active check-in to check out of.");
    }
    const updated = await this.prisma.checkIn.update({
      where: { id: open.id },
      data: { checkOutAt: new Date() },
      include: checkInInclude,
    });
    return toCheckInResponse(updated as CheckInWithMember);
  }

  /** Staff override: check out any open visit by its check-in id. */
  async checkOutById(tenantId: string, checkInId: string): Promise<CheckInResponseDto> {
    const existing = await this.prisma.checkIn.findFirst({ where: { id: checkInId, tenantId }, include: checkInInclude });
    if (!existing) {
      throw new NotFoundException('Check-in not found.');
    }
    if (existing.checkOutAt) {
      throw new BadRequestException('This check-in has already been checked out.');
    }
    const updated = await this.prisma.checkIn.update({
      where: { id: checkInId },
      data: { checkOutAt: new Date() },
      include: checkInInclude,
    });
    return toCheckInResponse(updated as CheckInWithMember);
  }

  async getStatus(tenantId: string, memberId: string): Promise<CheckInStatusResponseDto> {
    const open = await this.prisma.checkIn.findFirst({
      where: { tenantId, memberId, checkOutAt: null },
      orderBy: { checkInAt: 'desc' },
      include: checkInInclude,
    });
    return { checkedIn: !!open, checkIn: open ? toCheckInResponse(open) : null };
  }

  // ---------------------------------------------------------------------
  // QR check-in token — see CheckInToken's own schema comment for the
  // security reasoning (opaque, hashed at rest, single-use, short-lived).
  // ---------------------------------------------------------------------

  async issueCheckInToken(tenantId: string, memberId: string): Promise<CheckInTokenResponseDto> {
    await this.membersService.getMemberInTenant(tenantId, memberId);

    const rawToken = this.tokenService.generateOpaqueToken();
    const tokenHash = this.tokenService.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + AttendanceService.CHECK_IN_TOKEN_TTL_SECONDS * 1000);
    await this.prisma.checkInToken.create({ data: { tenantId, memberId, tokenHash, expiresAt } });

    return { token: rawToken, expiresAt, expiresInSeconds: AttendanceService.CHECK_IN_TOKEN_TTL_SECONDS };
  }

  /**
   * Redeems a QR token — the staff/kiosk side of the flow. A missing,
   * foreign-tenant, expired, or already-consumed token is a real error
   * (there's no legitimate member context yet to report a business outcome
   * for); only once the token is validated and consumed does this fall
   * through to the same eligibility/duplicate checks every other check-in
   * path uses. Consumption uses a conditional `updateMany` (consumedAt:
   * null) rather than a plain `update` so two simultaneous redemption
   * attempts of the same token can't both succeed — the second one simply
   * finds zero rows matched and reports "already used," the same
   * replay-prevention guarantee a database transaction would give here,
   * without needing one.
   */
  async redeemCheckInToken(tenantId: string, rawToken: string, redeemedByUserId: string): Promise<CheckInAttemptResponseDto> {
    const tokenHash = this.tokenService.hashToken(rawToken);
    const record = await this.prisma.checkInToken.findUnique({ where: { tokenHash } });
    if (!record || record.tenantId !== tenantId) {
      throw new BadRequestException('Invalid or unrecognized check-in code.');
    }
    if (record.expiresAt < new Date()) {
      throw new BadRequestException('This check-in code has expired.');
    }
    if (record.consumedAt) {
      throw new BadRequestException('This check-in code has already been used.');
    }

    const consumed = await this.prisma.checkInToken.updateMany({
      where: { id: record.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    if (consumed.count === 0) {
      throw new BadRequestException('This check-in code has already been used.');
    }

    return this.performCheckIn(tenantId, record.memberId, CheckInMethod.QR, redeemedByUserId);
  }

  // ---------------------------------------------------------------------
  // History / search / today / stats / inactive members
  // ---------------------------------------------------------------------

  async history(tenantId: string, query: ListAttendanceQueryDto): Promise<PaginatedResult<CheckInResponseDto>> {
    const where = {
      tenantId,
      ...(query.memberId ? { memberId: query.memberId } : {}),
      ...(query.method ? { method: query.method } : {}),
      ...(query.open === true ? { checkOutAt: null } : {}),
      ...(query.open === false ? { checkOutAt: { not: null } } : {}),
      ...(query.from || query.to
        ? {
            checkInAt: {
              ...(query.from ? { gte: parseDateOnly(query.from) } : {}),
              ...(query.to ? { lt: addDays(parseDateOnly(query.to), 1) } : {}),
            },
          }
        : {}),
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.checkIn.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { checkInAt: query.sortOrder },
        include: checkInInclude,
      }),
      this.prisma.checkIn.count({ where }),
    ]);

    return new PaginatedResult(items.map((i) => toCheckInResponse(i as CheckInWithMember)), totalItems, query.page, query.limit);
  }

  async historyForMember(tenantId: string, memberId: string, query: ListAttendanceQueryDto): Promise<PaginatedResult<CheckInResponseDto>> {
    return this.history(tenantId, { ...query, memberId, skip: query.skip });
  }

  async today(tenantId: string): Promise<TodayAttendanceResponseDto> {
    const start = startOfTodayUtc();
    const end = addDays(start, 1);

    const items = await this.prisma.checkIn.findMany({
      where: { tenantId, checkInAt: { gte: start, lt: end } },
      orderBy: { checkInAt: 'desc' },
      include: checkInInclude,
    });

    return {
      items: items.map((i) => toCheckInResponse(i as CheckInWithMember)),
      totalToday: items.length,
      currentlyIn: items.filter((i) => !i.checkOutAt).length,
    };
  }

  /** Day-bucketed visit counts over an inclusive date range — enough for the approved frontend's weekly/monthly trend charts without building a general reporting engine. */
  async stats(tenantId: string, query: AttendanceStatsQueryDto): Promise<AttendanceStatsPointDto[]> {
    const from = parseDateOnly(query.from);
    const to = addDays(parseDateOnly(query.to), 1);

    const rows = await this.prisma.checkIn.findMany({
      where: { tenantId, checkInAt: { gte: from, lt: to } },
      select: { checkInAt: true },
    });

    const buckets = new Map<string, number>();
    for (const row of rows) {
      const key = row.checkInAt.toISOString().slice(0, 10);
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, visits]) => ({ date, visits }));
  }

  /**
   * ACTIVE members with no visit inside the last `days` days (or ever) —
   * queryable data only, no scoring/prediction, exactly the raw material
   * the task asks this phase to prepare for a future retention feature to
   * build on, not implement itself.
   */
  async inactiveMembers(tenantId: string, days: number): Promise<InactiveMemberResponseDto[]> {
    const threshold = addDays(new Date(), -days);
    const today = new Date();

    const [activeMembers, recentCheckIns, lastVisits] = await Promise.all([
      this.prisma.member.findMany({
        where: { tenantId, status: MemberStatus.ACTIVE },
        select: { id: true, firstName: true, lastName: true },
      }),
      this.prisma.checkIn.groupBy({ by: ['memberId'], where: { tenantId, checkInAt: { gte: threshold } } }),
      this.prisma.checkIn.groupBy({ by: ['memberId'], where: { tenantId }, _max: { checkInAt: true } }),
    ]);

    const recentlyActive = new Set(recentCheckIns.map((r) => r.memberId));
    const lastVisitByMember = new Map(lastVisits.map((v) => [v.memberId, v._max.checkInAt] as const));

    return activeMembers
      .filter((m) => !recentlyActive.has(m.id))
      .map((m) => {
        const lastCheckInAt = lastVisitByMember.get(m.id) ?? null;
        return {
          memberId: m.id,
          firstName: m.firstName,
          lastName: m.lastName,
          lastCheckInAt,
          daysSinceLastVisit: lastCheckInAt ? daysBetween(lastCheckInAt, today) : null,
        };
      })
      .sort((a, b) => (b.daysSinceLastVisit ?? Infinity) - (a.daysSinceLastVisit ?? Infinity));
  }
}
