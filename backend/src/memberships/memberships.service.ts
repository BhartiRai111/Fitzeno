import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MembersService } from '../members/members.service.js';
import { MembershipPlansService } from '../membership-plans/membership-plans.service.js';
import { TransactionsService } from '../payments/transactions.service.js';
import { runSerializableTransaction } from '../common/utils/serializable-transaction.util.js';
import { BillingPeriod, MembershipRecordStatus, PaymentMethod, TransactionStatus, TransactionType } from '../generated/prisma/enums.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PaginatedResult } from '../common/dto/pagination-query.dto.js';
import {
  toMembershipResponse,
  computeEffectiveStatus,
  type MembershipResponseDto,
  type MembershipWithRelations,
} from './dto/membership-response.dto.js';
import type { CreateMembershipDto } from './dto/create-membership.dto.js';
import type { PurchaseMembershipDto } from './dto/purchase-membership.dto.js';
import type { RenewMembershipDto } from './dto/renew-membership.dto.js';
import { EffectiveMembershipStatusFilter, type ListMembershipsQueryDto } from './dto/list-memberships-query.dto.js';

const EXPIRING_SOON_THRESHOLD_DAYS = 14;

const membershipInclude = {
  member: { select: { id: true, firstName: true, lastName: true } },
  plan: { select: { id: true, name: true } },
  renewedInto: { select: { id: true } },
};

function toUtcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function todayUtc(): Date {
  return toUtcMidnight(new Date());
}

function parseDateOnly(value: string): Date {
  return toUtcMidnight(new Date(value));
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function addMonthsUtc(date: Date, months: number): Date {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

function billingPeriodToMonths(period: BillingPeriod): number {
  return period === BillingPeriod.YEARLY ? 12 : 1;
}

function daysBetween(from: Date, to: Date): number {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

@Injectable()
export class MembershipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membersService: MembersService,
    private readonly membershipPlansService: MembershipPlansService,
    private readonly transactionsService: TransactionsService,
  ) {}

  /**
   * PENDING for a bank transfer (awaiting clearance), PAID immediately for
   * everything else — mirrors the approved frontend's own
   * MembershipProvider.purchaseMembership branching exactly.
   */
  private initialTransactionStatus(method: PaymentMethod): TransactionStatus {
    return method === PaymentMethod.BANK_TRANSFER ? TransactionStatus.PENDING : TransactionStatus.PAID;
  }

  // ---------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------

  async findByIdInTenant(tenantId: string, id: string): Promise<MembershipResponseDto> {
    const membership = await this.getRawInTenant(tenantId, id);
    return toMembershipResponse(membership, todayUtc());
  }

  /**
   * Resolves "the member's current membership" purely at read time —
   * there is no stored pointer/flag for this (see the schema's own
   * comment on MemberMembership). Priority: a period actually covering
   * today, then a frozen one (still theirs, just paused), then the
   * soonest upcoming PENDING one, then — for historical context on a
   * member with nothing current — their most recently lapsed period.
   */
  async getCurrentForMember(tenantId: string, memberId: string): Promise<MembershipResponseDto | null> {
    const today = todayUtc();

    const inProgress = await this.prisma.memberMembership.findFirst({
      where: { tenantId, memberId, status: MembershipRecordStatus.ACTIVE, startDate: { lte: today }, endDate: { gte: today } },
      include: membershipInclude,
      orderBy: { startDate: 'desc' },
    });
    if (inProgress) return toMembershipResponse(inProgress, today);

    const frozen = await this.prisma.memberMembership.findFirst({
      where: { tenantId, memberId, status: MembershipRecordStatus.FROZEN },
      include: membershipInclude,
      orderBy: { updatedAt: 'desc' },
    });
    if (frozen) return toMembershipResponse(frozen, today);

    const upcoming = await this.prisma.memberMembership.findFirst({
      where: { tenantId, memberId, status: MembershipRecordStatus.ACTIVE, startDate: { gt: today } },
      include: membershipInclude,
      orderBy: { startDate: 'asc' },
    });
    if (upcoming) return toMembershipResponse(upcoming, today);

    const mostRecent = await this.prisma.memberMembership.findFirst({
      where: { tenantId, memberId },
      include: membershipInclude,
      orderBy: { endDate: 'desc' },
    });
    return mostRecent ? toMembershipResponse(mostRecent, today) : null;
  }

  async getHistoryForMember(tenantId: string, memberId: string, query: ListMembershipsQueryDto): Promise<PaginatedResult<MembershipResponseDto>> {
    return this.list(tenantId, { ...query, memberId, skip: query.skip });
  }

  async list(tenantId: string, query: ListMembershipsQueryDto): Promise<PaginatedResult<MembershipResponseDto>> {
    const today = todayUtc();
    const where: Prisma.MemberMembershipWhereInput = {
      tenantId,
      ...(query.memberId ? { memberId: query.memberId } : {}),
      ...(query.planId ? { planId: query.planId } : {}),
      ...(query.effectiveStatus ? this.effectiveStatusWhere(query.effectiveStatus, today) : {}),
      ...(query.endDateFrom || query.endDateTo
        ? {
            endDate: {
              ...(query.endDateFrom ? { gte: parseDateOnly(query.endDateFrom) } : {}),
              ...(query.endDateTo ? { lte: parseDateOnly(query.endDateTo) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            member: {
              OR: [
                { firstName: { contains: query.search, mode: 'insensitive' as const } },
                { lastName: { contains: query.search, mode: 'insensitive' as const } },
              ],
            },
          }
        : {}),
    };

    const sortableFields = ['startDate', 'endDate', 'createdAt'];
    const sortBy = sortableFields.includes(query.sortBy ?? '') ? query.sortBy! : 'startDate';

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.memberMembership.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { [sortBy]: query.sortOrder },
        include: membershipInclude,
      }),
      this.prisma.memberMembership.count({ where }),
    ]);

    return new PaginatedResult(items.map((m) => toMembershipResponse(m, today)), totalItems, query.page, query.limit);
  }

  /** Counts for owner-dashboard/report consumption — see the README's Notification & Reporting compatibility notes. */
  async getStats(tenantId: string) {
    const today = todayUtc();
    const soon = addDays(today, EXPIRING_SOON_THRESHOLD_DAYS);

    const [active, expiring, pending, expired, frozen, cancelled] = await Promise.all([
      this.prisma.memberMembership.count({ where: { tenantId, status: 'ACTIVE', startDate: { lte: today }, endDate: { gte: today } } }),
      this.prisma.memberMembership.count({ where: { tenantId, status: 'ACTIVE', startDate: { lte: today }, endDate: { gte: today, lte: soon } } }),
      this.prisma.memberMembership.count({ where: { tenantId, status: 'ACTIVE', startDate: { gt: today } } }),
      this.prisma.memberMembership.count({ where: { tenantId, status: 'ACTIVE', endDate: { lt: today } } }),
      this.prisma.memberMembership.count({ where: { tenantId, status: 'FROZEN' } }),
      this.prisma.memberMembership.count({ where: { tenantId, status: 'CANCELLED' } }),
    ]);

    return { active, expiring, pending, expired, frozen, cancelled };
  }

  // ---------------------------------------------------------------------
  // Writes
  // ---------------------------------------------------------------------

  async create(tenantId: string, dto: CreateMembershipDto, recordedByUserId?: string): Promise<MembershipResponseDto> {
    return runSerializableTransaction(this.prisma, async (tx) => {
      await this.membersService.getMemberInTenant(tenantId, dto.memberId);
      const plan = await this.membershipPlansService.getActivePlanOrThrow(tenantId, dto.planId);

      const startDate = dto.startDate ? parseDateOnly(dto.startDate) : todayUtc();
      const endDate = addMonthsUtc(startDate, billingPeriodToMonths(plan.billingPeriod));

      await this.assertNoOverlap(tx, tenantId, dto.memberId, startDate, endDate);

      const membership = await tx.memberMembership.create({
        data: {
          tenantId,
          memberId: dto.memberId,
          planId: plan.id,
          planName: plan.name,
          price: plan.price,
          billingPeriod: plan.billingPeriod,
          startDate,
          endDate,
          paymentMethod: dto.paymentMethod,
          paymentReference: dto.paymentReference,
        },
        include: membershipInclude,
      });

      // A payment method means "yes, bill this" — a staff-created
      // membership with none is a deliberate comp/administrative
      // enrollment with no financial record, not an oversight. See the
      // Payments module's own README notes on this integration boundary:
      // Memberships stays responsible for membership state, Payments for
      // financial state — this is the one call that connects them.
      if (dto.paymentMethod) {
        await this.transactionsService.recordWithinTransaction(tx, tenantId, {
          memberId: dto.memberId,
          type: TransactionType.MEMBERSHIP_PURCHASE,
          description: `${plan.name} plan — purchase`,
          amount: Number(plan.price),
          method: dto.paymentMethod,
          status: this.initialTransactionStatus(dto.paymentMethod),
          relatedMembershipId: membership.id,
          recordedByUserId,
        });
      }

      return toMembershipResponse(membership, todayUtc());
    });
  }

  /**
   * The member-portal action — always "purchase or renew, whichever
   * applies," mirroring the approved frontend's single unified
   * purchaseMembership() call. A member with nothing current (never
   * joined, or their last period is fully cancelled/lapsed with nothing
   * pending) gets a fresh membership starting today; a member with an
   * active/pending/frozen one gets it renewed (optionally onto a
   * different plan — a "switch").
   */
  async purchaseOrRenewForSelf(tenantId: string, userId: string, dto: PurchaseMembershipDto): Promise<MembershipResponseDto> {
    const memberId = await this.membersService.getOwnMemberId(tenantId, userId);
    const current = await this.getCurrentForMember(tenantId, memberId);

    // getCurrentForMember always surfaces the latest period in a member's
    // renewal chain (a later renewal's endDate always overtakes the one it
    // renewed from), so any non-cancelled result here is safe to renew —
    // an expired one simply renews starting fresh from today (see
    // renewInternal's date math), exactly matching the frontend's own
    // "renew" vs. "purchase" being one unified action either way.
    if (current && current.status !== 'CANCELLED') {
      return this.renewInternal(tenantId, current.id, dto, userId);
    }
    return this.create(
      tenantId,
      { memberId, planId: dto.planId, paymentMethod: dto.paymentMethod, paymentReference: dto.paymentReference },
      userId,
    );
  }

  async renew(tenantId: string, id: string, dto: RenewMembershipDto, recordedByUserId?: string): Promise<MembershipResponseDto> {
    return this.renewInternal(tenantId, id, dto, recordedByUserId);
  }

  private async renewInternal(
    tenantId: string,
    currentId: string,
    dto: RenewMembershipDto,
    recordedByUserId?: string,
  ): Promise<MembershipResponseDto> {
    return runSerializableTransaction(this.prisma, async (tx) => {
      const current = await tx.memberMembership.findFirst({ where: { id: currentId, tenantId } });
      if (!current) {
        throw new NotFoundException('Membership not found.');
      }
      if (current.status === MembershipRecordStatus.CANCELLED) {
        throw new BadRequestException('This membership has been cancelled — create a new one instead of renewing it.');
      }
      // Keeps the renewal chain a simple, unambiguous linked list — a
      // period that's already been renewed into a later one can't branch
      // into a second next-period; renew the latest one in the chain instead.
      const alreadyRenewedInto = await tx.memberMembership.findUnique({ where: { renewedFromId: current.id } });
      if (alreadyRenewedInto) {
        throw new ConflictException('This membership has already been renewed — renew its latest period instead.');
      }

      const plan = await this.membershipPlansService.getActivePlanOrThrow(tenantId, dto.planId ?? current.planId);

      const today = todayUtc();
      const baseStart = current.endDate >= today ? addDays(current.endDate, 1) : today;
      const newEnd = addMonthsUtc(baseStart, billingPeriodToMonths(plan.billingPeriod));

      await this.assertNoOverlap(tx, tenantId, current.memberId, baseStart, newEnd, current.id);

      const membership = await tx.memberMembership.create({
        data: {
          tenantId,
          memberId: current.memberId,
          planId: plan.id,
          planName: plan.name,
          price: plan.price,
          billingPeriod: plan.billingPeriod,
          startDate: baseStart,
          endDate: newEnd,
          renewedFromId: current.id,
          paymentMethod: dto.paymentMethod,
          paymentReference: dto.paymentReference,
        },
        include: membershipInclude,
      });

      // See create()'s own comment: no payment method means a deliberate
      // comp/administrative renewal, not a missed financial record.
      if (dto.paymentMethod) {
        await this.transactionsService.recordWithinTransaction(tx, tenantId, {
          memberId: current.memberId,
          type: TransactionType.MEMBERSHIP_RENEWAL,
          description: `${plan.name} plan — renewal`,
          amount: Number(plan.price),
          method: dto.paymentMethod,
          status: this.initialTransactionStatus(dto.paymentMethod),
          relatedMembershipId: membership.id,
          recordedByUserId,
        });
      }

      return toMembershipResponse(membership, today);
    });
  }

  async freeze(tenantId: string, id: string): Promise<MembershipResponseDto> {
    const current = await this.getRawInTenant(tenantId, id);
    const today = todayUtc();
    if (computeEffectiveStatus(current, today) !== 'ACTIVE') {
      throw new BadRequestException('Only a currently active membership can be frozen.');
    }

    const membership = await this.prisma.memberMembership.update({
      where: { id },
      data: { status: MembershipRecordStatus.FROZEN, frozenAt: new Date() },
      include: membershipInclude,
    });
    return toMembershipResponse(membership, today);
  }

  /** Extends endDate by the number of days the membership spent frozen — the member doesn't lose paid time they couldn't use. */
  async unfreeze(tenantId: string, id: string): Promise<MembershipResponseDto> {
    const current = await this.getRawInTenant(tenantId, id);
    if (current.status !== MembershipRecordStatus.FROZEN || !current.frozenAt) {
      throw new BadRequestException('This membership is not frozen.');
    }

    const today = todayUtc();
    const frozenSince = toUtcMidnight(current.frozenAt);
    const frozenDays = Math.max(0, daysBetween(frozenSince, today));

    const membership = await this.prisma.memberMembership.update({
      where: { id },
      data: { status: MembershipRecordStatus.ACTIVE, frozenAt: null, endDate: addDays(current.endDate, frozenDays) },
      include: membershipInclude,
    });
    return toMembershipResponse(membership, today);
  }

  async cancel(tenantId: string, id: string, reason?: string): Promise<MembershipResponseDto> {
    const current = await this.getRawInTenant(tenantId, id);
    if (current.status === MembershipRecordStatus.CANCELLED) {
      throw new BadRequestException('This membership is already cancelled.');
    }

    const membership = await this.prisma.memberMembership.update({
      where: { id },
      data: { status: MembershipRecordStatus.CANCELLED, cancelledAt: new Date(), cancellationReason: reason },
      include: membershipInclude,
    });
    return toMembershipResponse(membership, todayUtc());
  }

  // ---------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------

  private effectiveStatusWhere(filter: EffectiveMembershipStatusFilter, today: Date): Prisma.MemberMembershipWhereInput {
    const soon = addDays(today, EXPIRING_SOON_THRESHOLD_DAYS);
    switch (filter) {
      case EffectiveMembershipStatusFilter.PENDING:
        return { status: 'ACTIVE', startDate: { gt: today } };
      case EffectiveMembershipStatusFilter.ACTIVE:
        return { status: 'ACTIVE', startDate: { lte: today }, endDate: { gte: today } };
      case EffectiveMembershipStatusFilter.EXPIRING:
        return { status: 'ACTIVE', startDate: { lte: today }, endDate: { gte: today, lte: soon } };
      case EffectiveMembershipStatusFilter.EXPIRED:
        return { status: 'ACTIVE', endDate: { lt: today } };
      case EffectiveMembershipStatusFilter.FROZEN:
        return { status: 'FROZEN' };
      case EffectiveMembershipStatusFilter.CANCELLED:
        return { status: 'CANCELLED' };
    }
  }

  /** Rejects a [startDate, endDate] window that overlaps another non-cancelled period this member already holds. */
  private async assertNoOverlap(
    tx: Prisma.TransactionClient,
    tenantId: string,
    memberId: string,
    startDate: Date,
    endDate: Date,
    excludeId?: string,
  ): Promise<void> {
    const overlapping = await tx.memberMembership.findFirst({
      where: {
        tenantId,
        memberId,
        status: { not: MembershipRecordStatus.CANCELLED },
        ...(excludeId ? { id: { not: excludeId } } : {}),
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });
    if (overlapping) {
      throw new ConflictException('This member already has a membership period that overlaps these dates.');
    }
  }

  private async getRawInTenant(tenantId: string, id: string): Promise<MembershipWithRelations> {
    const membership = await this.prisma.memberMembership.findFirst({ where: { id, tenantId }, include: membershipInclude });
    if (!membership) {
      throw new NotFoundException('Membership not found.');
    }
    return membership;
  }
}
