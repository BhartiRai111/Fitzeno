import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { MembersService, type CallerContext } from '../members/members.service.js';
import { LeadSource, LeadStatus, UserRole } from '../generated/prisma/enums.js';
import type { Lead } from '../generated/prisma/client.js';
import { PaginatedResult, type PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import type { CreateLeadDto } from './dto/create-lead.dto.js';
import type { UpdateLeadDto } from './dto/update-lead.dto.js';
import type { ConvertLeadDto } from './dto/convert-lead.dto.js';
import {
  toLeadResponse,
  toLeadSummaryResponse,
  type LeadResponseDto,
  type LeadSummaryResponseDto,
} from './dto/lead-response.dto.js';
import { toLeadNoteResponse, type LeadNoteResponseDto } from './dto/lead-note-response.dto.js';
import { toMemberResponse, type MemberResponseDto } from '../members/dto/member-response.dto.js';

export interface ListLeadsFilter {
  status?: LeadStatus;
  source?: LeadSource;
  assignedToId?: string;
  followUpDueBy?: string;
}

const detailInclude = {
  assignedTo: { select: { id: true, firstName: true, lastName: true } },
  convertedMember: { select: { id: true } },
  notes: {
    orderBy: { createdAt: 'desc' as const },
    include: { author: { select: { id: true, firstName: true, lastName: true } } },
  },
};

const summaryInclude = {
  assignedTo: { select: { id: true, firstName: true, lastName: true } },
};

const memberDetailInclude = {
  trainer: { select: { id: true, firstName: true, lastName: true } },
  convertedFromLead: { select: { id: true, source: true, interest: true } },
  notes: {
    orderBy: { createdAt: 'desc' as const },
    include: { author: { select: { id: true, firstName: true, lastName: true } } },
  },
};

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly membersService: MembersService,
  ) {}

  /**
   * Same role-scoping rule as Member.trainerId (see MembersService) —
   * followed here so a TRAINER's "no access to business-wide data" holds
   * for leads too, not just members. Most gyms won't route lead follow-up
   * to trainers at all, in which case this simply means a trainer sees no
   * leads, which is correct rather than a special case to code around.
   */
  private applyAssigneeScope(where: Record<string, unknown>, caller: CallerContext): void {
    if (caller.role === UserRole.TRAINER) {
      where.assignedToId = caller.id;
    }
  }

  private assertAssigneeCanAccess(lead: Lead, caller: CallerContext): void {
    if (caller.role === UserRole.TRAINER && lead.assignedToId !== caller.id) {
      throw new ForbiddenException("You don't have access to this lead.");
    }
  }

  private async assertValidAssignee(tenantId: string, assignedToId: string): Promise<void> {
    const assignee = await this.usersService.findByIdInTenant(tenantId, assignedToId);
    if (assignee.role === UserRole.MEMBER) {
      throw new BadRequestException('assignedToId must reference a staff member, not a portal member.');
    }
  }

  async create(tenantId: string, dto: CreateLeadDto): Promise<LeadResponseDto> {
    if (dto.assignedToId) {
      await this.assertValidAssignee(tenantId, dto.assignedToId);
    }
    const lead = await this.prisma.lead.create({
      data: {
        tenantId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        source: dto.source,
        interest: dto.interest,
        assignedToId: dto.assignedToId,
        nextFollowUpAt: dto.nextFollowUpAt ? new Date(dto.nextFollowUpAt) : undefined,
      },
      include: detailInclude,
    });
    return toLeadResponse(lead);
  }

  async findByIdInTenant(tenantId: string, id: string, caller: CallerContext): Promise<LeadResponseDto> {
    const lead = await this.prisma.lead.findFirst({ where: { id, tenantId }, include: detailInclude });
    if (!lead) {
      throw new NotFoundException('Lead not found.');
    }
    this.assertAssigneeCanAccess(lead, caller);
    return toLeadResponse(lead);
  }

  async update(tenantId: string, id: string, dto: UpdateLeadDto): Promise<LeadResponseDto> {
    const existing = await this.requireInTenant(tenantId, id);
    if (existing.status === LeadStatus.CONVERTED) {
      throw new BadRequestException('This lead has already converted — edit the member record instead.');
    }
    if (dto.assignedToId) {
      await this.assertValidAssignee(tenantId, dto.assignedToId);
    }

    const lead = await this.prisma.lead.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        source: dto.source,
        interest: dto.interest,
        status: dto.status,
        lostReason: dto.lostReason,
        ...(dto.assignedToId !== undefined ? { assignedToId: dto.assignedToId } : {}),
        ...(dto.nextFollowUpAt !== undefined
          ? { nextFollowUpAt: dto.nextFollowUpAt ? new Date(dto.nextFollowUpAt) : null }
          : {}),
        ...(dto.trialScheduledAt !== undefined
          ? { trialScheduledAt: dto.trialScheduledAt ? new Date(dto.trialScheduledAt) : null }
          : {}),
        ...(dto.trialNotes !== undefined ? { trialNotes: dto.trialNotes } : {}),
      },
      include: detailInclude,
    });
    return toLeadResponse(lead);
  }

  async list(
    tenantId: string,
    query: PaginationQueryDto,
    filter: ListLeadsFilter,
    caller: CallerContext,
  ): Promise<PaginatedResult<LeadSummaryResponseDto>> {
    const where: Record<string, unknown> = {
      tenantId,
      ...(filter.source ? { source: filter.source } : {}),
      ...(filter.assignedToId ? { assignedToId: filter.assignedToId } : {}),
      ...(filter.followUpDueBy ? { nextFollowUpAt: { lte: new Date(filter.followUpDueBy) } } : {}),
      // An explicit status filter always wins; without one, a followUpDueBy
      // query implicitly excludes CONVERTED/LOST — a lead that's already
      // closed doesn't belong in a "needs attention" list even if its old
      // follow-up date is in the past.
      ...(filter.status
        ? { status: filter.status }
        : filter.followUpDueBy
          ? { status: { notIn: [LeadStatus.CONVERTED, LeadStatus.LOST] } }
          : {}),
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: 'insensitive' as const } },
              { lastName: { contains: query.search, mode: 'insensitive' as const } },
              { email: { contains: query.search, mode: 'insensitive' as const } },
              { phone: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    this.applyAssigneeScope(where, caller);

    const sortableFields = ['createdAt', 'nextFollowUpAt', 'firstName', 'lastName', 'status'];
    const sortBy = sortableFields.includes(query.sortBy ?? '') ? query.sortBy! : 'createdAt';

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.lead.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { [sortBy]: query.sortOrder },
        include: summaryInclude,
      }),
      this.prisma.lead.count({ where }),
    ]);

    return new PaginatedResult(items.map(toLeadSummaryResponse), totalItems, query.page, query.limit);
  }

  async addNote(tenantId: string, leadId: string, authorId: string, body: string): Promise<LeadNoteResponseDto> {
    await this.requireInTenant(tenantId, leadId);
    const note = await this.prisma.leadNote.create({
      data: { leadId, authorId, body },
      include: { author: { select: { id: true, firstName: true, lastName: true } } },
    });
    return toLeadNoteResponse(note);
  }

  /**
   * The one place a Lead becomes CONVERTED and the one place a Member gets
   * created from a lead — see LeadStatus's and Member's schema comments.
   * Member creation/linking and the lead's own status update run in one
   * transaction so a crash partway through can't leave a lead marked
   * CONVERTED with no member, or a member created against a lead that
   * still shows open.
   */
  async convert(tenantId: string, id: string, dto: ConvertLeadDto, caller: CallerContext): Promise<MemberResponseDto> {
    const lead = await this.requireInTenant(tenantId, id);
    this.assertAssigneeCanAccess(lead, caller);
    if (lead.status === LeadStatus.CONVERTED) {
      throw new BadRequestException('This lead has already converted.');
    }

    const member = await this.prisma.$transaction(async (tx) => {
      const created = await this.membersService.findOrCreateForConversion(
        tenantId,
        { firstName: lead.firstName, lastName: lead.lastName, email: lead.email, phone: lead.phone },
        lead.id,
        { trainerId: dto.trainerId, joinedOn: dto.joinedOn, client: tx },
      );
      await tx.lead.update({ where: { id: lead.id }, data: { status: LeadStatus.CONVERTED, convertedAt: new Date() } });
      return created;
    });

    const withRelations = await this.prisma.member.findUniqueOrThrow({
      where: { id: member.id },
      include: memberDetailInclude,
    });
    return toMemberResponse(withRelations);
  }

  /** Tenant-scoped existence check — 404s, never confirms a cross-tenant id exists. */
  private async requireInTenant(tenantId: string, id: string): Promise<Lead> {
    const lead = await this.prisma.lead.findFirst({ where: { id, tenantId } });
    if (!lead) {
      throw new NotFoundException('Lead not found.');
    }
    return lead;
  }
}
