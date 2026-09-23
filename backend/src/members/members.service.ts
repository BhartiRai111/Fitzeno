import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { MemberStatus, UserRole } from '../generated/prisma/enums.js';
import type { Member, Prisma } from '../generated/prisma/client.js';
import { PaginatedResult, type PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import type { CreateMemberDto } from './dto/create-member.dto.js';
import type { UpdateMemberDto } from './dto/update-member.dto.js';
import {
  toMemberResponse,
  toMemberSummaryResponse,
  type MemberResponseDto,
  type MemberSummaryResponseDto,
} from './dto/member-response.dto.js';
import { toMemberNoteResponse, type MemberNoteResponseDto } from './dto/member-note-response.dto.js';

export interface ListMembersFilter {
  status?: MemberStatus;
  trainerId?: string;
}

/** What the request is running as — drives the trainer-scoping rule below. */
export interface CallerContext {
  id: string;
  role: UserRole;
}

const detailInclude = {
  trainer: { select: { id: true, firstName: true, lastName: true } },
  convertedFromLead: { select: { id: true, source: true, interest: true } },
  notes: {
    orderBy: { createdAt: 'desc' as const },
    include: { author: { select: { id: true, firstName: true, lastName: true } } },
  },
};

const summaryInclude = {
  trainer: { select: { id: true, firstName: true, lastName: true } },
};

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * TRAINER is the one role with a narrower view than its permission level
   * implies: `members:view` lets a trainer reach these endpoints at all, but
   * "no access to business-wide data" (their own role description) means
   * they only ever see members assigned to them. MANAGE-level roles never
   * hit this — creating/updating a member already requires `members:manage`,
   * which no TRAINER has by default. Independent of permission overrides on
   * purpose — see the schema's Member comment on this being a role-scoping
   * rule, not a permission level.
   */
  private applyTrainerScope(where: Record<string, unknown>, caller: CallerContext): void {
    if (caller.role === UserRole.TRAINER) {
      where.trainerId = caller.id;
    }
  }

  private assertTrainerCanAccess(member: Member, caller: CallerContext): void {
    if (caller.role === UserRole.TRAINER && member.trainerId !== caller.id) {
      throw new ForbiddenException("You don't have access to this member.");
    }
  }

  async assertValidTrainer(tenantId: string, trainerId: string): Promise<void> {
    const trainer = await this.usersService.findByIdInTenant(tenantId, trainerId);
    if (trainer.role !== UserRole.TRAINER) {
      throw new BadRequestException('trainerId must reference a trainer in this gym.');
    }
  }

  async create(tenantId: string, dto: CreateMemberDto): Promise<MemberResponseDto> {
    if (dto.trainerId) {
      await this.assertValidTrainer(tenantId, dto.trainerId);
    }
    const member = await this.prisma.member.create({
      data: {
        tenantId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        gender: dto.gender,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        addressLine: dto.addressLine,
        emergencyContactName: dto.emergencyContactName,
        emergencyContactPhone: dto.emergencyContactPhone,
        trainerId: dto.trainerId,
        joinedOn: dto.joinedOn ? new Date(dto.joinedOn) : undefined,
      },
      include: detailInclude,
    });
    return toMemberResponse(member);
  }

  async findByIdInTenant(tenantId: string, id: string, caller: CallerContext): Promise<MemberResponseDto> {
    const member = await this.prisma.member.findFirst({ where: { id, tenantId }, include: detailInclude });
    if (!member) {
      throw new NotFoundException('Member not found.');
    }
    this.assertTrainerCanAccess(member, caller);
    return toMemberResponse(member);
  }

  async findOwnProfile(tenantId: string, userId: string): Promise<MemberResponseDto> {
    const member = await this.prisma.member.findFirst({ where: { tenantId, userId }, include: detailInclude });
    if (!member) {
      throw new NotFoundException("You don't have a member profile yet.");
    }
    return toMemberResponse(member);
  }

  async update(tenantId: string, id: string, dto: UpdateMemberDto): Promise<MemberResponseDto> {
    await this.requireInTenant(tenantId, id);
    if (dto.trainerId) {
      await this.assertValidTrainer(tenantId, dto.trainerId);
    }
    const member = await this.prisma.member.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        gender: dto.gender,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        addressLine: dto.addressLine,
        emergencyContactName: dto.emergencyContactName,
        emergencyContactPhone: dto.emergencyContactPhone,
        status: dto.status,
        joinedOn: dto.joinedOn ? new Date(dto.joinedOn) : undefined,
        ...(dto.trainerId !== undefined ? { trainerId: dto.trainerId } : {}),
      },
      include: detailInclude,
    });
    return toMemberResponse(member);
  }

  async list(
    tenantId: string,
    query: PaginationQueryDto,
    filter: ListMembersFilter,
    caller: CallerContext,
  ): Promise<PaginatedResult<MemberSummaryResponseDto>> {
    const where: Record<string, unknown> = {
      tenantId,
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.trainerId ? { trainerId: filter.trainerId } : {}),
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
    this.applyTrainerScope(where, caller);

    const sortableFields = ['createdAt', 'joinedOn', 'firstName', 'lastName', 'status'];
    const sortBy = sortableFields.includes(query.sortBy ?? '') ? query.sortBy! : 'createdAt';

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.member.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { [sortBy]: query.sortOrder },
        include: summaryInclude,
      }),
      this.prisma.member.count({ where }),
    ]);

    return new PaginatedResult(items.map(toMemberSummaryResponse), totalItems, query.page, query.limit);
  }

  async addNote(tenantId: string, memberId: string, authorId: string, body: string): Promise<MemberNoteResponseDto> {
    await this.requireInTenant(tenantId, memberId);
    const note = await this.prisma.memberNote.create({
      data: { memberId, authorId, body },
      include: { author: { select: { id: true, firstName: true, lastName: true } } },
    });
    return toMemberNoteResponse(note);
  }

  /**
   * Used by LeadsService.convert() — never called directly from a
   * controller. Creates a new Member from the converting lead's contact
   * details, UNLESS a Member with the same email already exists in this
   * tenant and isn't already linked to a different converted lead, in
   * which case that existing record is linked instead of creating a
   * duplicate — see the schema's Member comment on why conversion must not
   * create disconnected duplicate person records (e.g. the same person was
   * already added as a walk-in member before this old lead got processed).
   *
   * Accepts an optional transactional client so the caller (LeadsService)
   * can run this and the Lead's own status update as one atomic operation —
   * important here specifically, since without it a crash between the two
   * steps could leave a member created but its originating lead still
   * showing NEW, or (for an email-less lead, where the dedup check above
   * can't apply) a retried conversion creating a second duplicate member.
   */
  async findOrCreateForConversion(
    tenantId: string,
    contact: { firstName: string; lastName: string; email?: string | null; phone?: string | null },
    convertedFromLeadId: string,
    options: { trainerId?: string; joinedOn?: string; client?: Prisma.TransactionClient } = {},
  ): Promise<Member> {
    const client = options.client ?? this.prisma;
    if (options.trainerId) {
      await this.assertValidTrainer(tenantId, options.trainerId);
    }

    if (contact.email) {
      const existing = await client.member.findFirst({
        where: { tenantId, email: contact.email, convertedFromLeadId: null },
      });
      if (existing) {
        return client.member.update({ where: { id: existing.id }, data: { convertedFromLeadId } });
      }
    }

    return client.member.create({
      data: {
        tenantId,
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phone,
        trainerId: options.trainerId,
        joinedOn: options.joinedOn ? new Date(options.joinedOn) : undefined,
        convertedFromLeadId,
      },
    });
  }

  /**
   * Called by AuthService.register() right after a new portal account is
   * created, so "become an authenticated portal user" is automatic rather
   * than a separate manual step — see the Member schema comment. A no-op
   * when no pending (unlinked) member with this email exists in the tenant,
   * which is the common case for a member who was never staff-added first.
   */
  async linkPendingPortalUser(tenantId: string, email: string, userId: string): Promise<void> {
    const pending = await this.prisma.member.findFirst({
      where: { tenantId, email, userId: null },
    });
    if (!pending) {
      return;
    }
    await this.prisma.member.update({ where: { id: pending.id }, data: { userId } });
  }

  /** Tenant-scoped existence check shared by update()/addNote() — 404s, never confirms a cross-tenant id exists. */
  private async requireInTenant(tenantId: string, id: string): Promise<void> {
    const exists = await this.prisma.member.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!exists) {
      throw new NotFoundException('Member not found.');
    }
  }
}
