import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MembershipRecordStatus, PlanStatus, UserRole } from '../generated/prisma/enums.js';
import type { CreateMembershipPlanDto } from './dto/create-membership-plan.dto.js';
import type { UpdateMembershipPlanDto } from './dto/update-membership-plan.dto.js';
import type { ListMembershipPlansQueryDto } from './dto/list-membership-plans-query.dto.js';
import { PaginatedResult } from '../common/dto/pagination-query.dto.js';
import {
  toMembershipPlanResponse,
  type MembershipPlanResponseDto,
} from './dto/membership-plan-response.dto.js';

export interface CallerContext {
  role: UserRole;
}

function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

@Injectable()
export class MembershipPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateMembershipPlanDto): Promise<MembershipPlanResponseDto> {
    const existing = await this.prisma.membershipPlan.findUnique({ where: { tenantId_name: { tenantId, name: dto.name } } });
    if (existing) {
      throw new ConflictException('A plan with this name already exists.');
    }

    const plan = await this.prisma.membershipPlan.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        price: dto.price,
        billingPeriod: dto.billingPeriod,
        perks: dto.perks ?? [],
        isPopular: dto.isPopular ?? false,
      },
    });
    return toMembershipPlanResponse(plan);
  }

  async findByIdInTenant(tenantId: string, id: string): Promise<MembershipPlanResponseDto> {
    const plan = await this.prisma.membershipPlan.findFirst({ where: { id, tenantId } });
    if (!plan) {
      throw new NotFoundException('Membership plan not found.');
    }
    return toMembershipPlanResponse(plan);
  }

  /** Used by MembershipsService to validate a planId and read its current price/billing period without a module import. */
  async getActivePlanOrThrow(tenantId: string, id: string) {
    const plan = await this.prisma.membershipPlan.findFirst({ where: { id, tenantId } });
    if (!plan) {
      throw new NotFoundException('Membership plan not found.');
    }
    if (plan.status !== PlanStatus.ACTIVE) {
      throw new BadRequestException('This plan is no longer available — choose an active plan.');
    }
    return plan;
  }

  async update(tenantId: string, id: string, dto: UpdateMembershipPlanDto): Promise<MembershipPlanResponseDto> {
    await this.requireInTenant(tenantId, id);
    if (dto.name) {
      const existing = await this.prisma.membershipPlan.findUnique({ where: { tenantId_name: { tenantId, name: dto.name } } });
      if (existing && existing.id !== id) {
        throw new ConflictException('A plan with this name already exists.');
      }
    }

    const plan = await this.prisma.membershipPlan.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        billingPeriod: dto.billingPeriod,
        perks: dto.perks,
        isPopular: dto.isPopular,
      },
    });
    return toMembershipPlanResponse(plan);
  }

  async archive(tenantId: string, id: string): Promise<MembershipPlanResponseDto> {
    const existing = await this.requireInTenant(tenantId, id);
    if (existing.status === PlanStatus.ARCHIVED) {
      throw new BadRequestException('This plan is already archived.');
    }
    const plan = await this.prisma.membershipPlan.update({ where: { id }, data: { status: PlanStatus.ARCHIVED } });
    return toMembershipPlanResponse(plan);
  }

  async activate(tenantId: string, id: string): Promise<MembershipPlanResponseDto> {
    const existing = await this.requireInTenant(tenantId, id);
    if (existing.status === PlanStatus.ACTIVE) {
      throw new BadRequestException('This plan is already active.');
    }
    const plan = await this.prisma.membershipPlan.update({ where: { id }, data: { status: PlanStatus.ACTIVE } });
    return toMembershipPlanResponse(plan);
  }

  /**
   * A portal MEMBER only ever sees ACTIVE plans (what they can actually
   * buy/switch to), regardless of any status filter they pass — the same
   * "role forces the effective filter" precedent as TRAINER scoping
   * elsewhere in this backend. Staff see every plan by default (they need
   * archived ones visible for management/history), narrowed by an explicit
   * status filter when given.
   */
  async list(
    tenantId: string,
    query: ListMembershipPlansQueryDto,
    caller: CallerContext,
  ): Promise<PaginatedResult<MembershipPlanResponseDto & { activeMemberCount: number }>> {
    const where = {
      tenantId,
      ...(caller.role === UserRole.MEMBER ? { status: PlanStatus.ACTIVE } : query.status ? { status: query.status } : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' as const } } : {}),
    };

    const sortableFields = ['createdAt', 'name', 'price'];
    const sortBy = sortableFields.includes(query.sortBy ?? '') ? query.sortBy! : 'createdAt';

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.membershipPlan.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { [sortBy]: query.sortOrder },
      }),
      this.prisma.membershipPlan.count({ where }),
    ]);

    const today = todayUtc();
    const counts = await this.prisma.memberMembership.groupBy({
      by: ['planId'],
      where: {
        tenantId,
        planId: { in: items.map((p) => p.id) },
        status: MembershipRecordStatus.ACTIVE,
        startDate: { lte: today },
        endDate: { gte: today },
      },
      _count: { _all: true },
    });
    const countByPlanId = new Map(counts.map((c) => [c.planId, c._count._all]));

    const withCounts = items.map((plan) => ({
      ...toMembershipPlanResponse(plan),
      activeMemberCount: countByPlanId.get(plan.id) ?? 0,
    }));

    return new PaginatedResult(withCounts, totalItems, query.page, query.limit);
  }

  private async requireInTenant(tenantId: string, id: string) {
    const plan = await this.prisma.membershipPlan.findFirst({ where: { id, tenantId } });
    if (!plan) {
      throw new NotFoundException('Membership plan not found.');
    }
    return plan;
  }
}
