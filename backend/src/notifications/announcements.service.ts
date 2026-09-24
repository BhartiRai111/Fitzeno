import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from './notifications.service.js';
import { AnnouncementAudience, NotificationCategory, UserRole } from '../generated/prisma/enums.js';
import { PaginatedResult } from '../common/dto/pagination-query.dto.js';
import { toAnnouncementResponse, type AnnouncementResponseDto, type AnnouncementWithRelations } from './dto/announcement-response.dto.js';
import type { CreateAnnouncementDto } from './dto/create-announcement.dto.js';
import type { ListAnnouncementsQueryDto } from './dto/list-announcements-query.dto.js';

const EXPIRING_SOON_THRESHOLD_DAYS = 14;

const announcementInclude = {
  sentBy: { select: { id: true, firstName: true, lastName: true } },
};

function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/**
 * Broad communication to a resolved audience — see the Announcement
 * model's own comment for why delivery is just N Notification rows
 * (category ANNOUNCEMENT), not a parallel read-tracking mechanism.
 * Deliberately NOT a marketing platform: eight fixed audience shapes,
 * no scheduling, no A/B, no per-recipient personalization — matching the
 * approved frontend's own SendNotificationDialog exactly.
 */
@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getAudienceCount(tenantId: string, audience: AnnouncementAudience, planId?: string, memberIds?: string[]): Promise<{ count: number }> {
    const userIds = await this.resolveRecipientUserIds(tenantId, audience, planId, memberIds);
    return { count: userIds.length };
  }

  /**
   * Creates the Announcement record, then fans it out as one Notification
   * per resolved recipient. These are two separate writes, not one atomic
   * transaction — unlike the Payments module's financial writes, a small
   * window where the Announcement row exists slightly ahead of its
   * Notification rows carries no real-world cost here (nothing reads
   * "recipientCount" as a live invariant that must always match delivered
   * rows exactly; it's a historical snapshot — see the model's own
   * comment), so the added complexity of a shared-transaction split
   * wasn't judged worth it for this feature.
   */
  async send(tenantId: string, sentByUserId: string, dto: CreateAnnouncementDto): Promise<AnnouncementResponseDto> {
    const userIds = await this.resolveRecipientUserIds(tenantId, dto.audience, dto.planId, dto.memberIds);

    const announcement = await this.prisma.announcement.create({
      data: {
        tenantId,
        title: dto.title,
        message: dto.message,
        priority: dto.priority,
        audience: dto.audience,
        audiencePlanId: dto.audience === AnnouncementAudience.PLAN_MEMBERS ? dto.planId : null,
        recipientCount: userIds.length,
        sentByUserId,
      },
      include: announcementInclude,
    });

    if (userIds.length > 0) {
      await this.notificationsService.notify(tenantId, userIds, {
        category: NotificationCategory.ANNOUNCEMENT,
        priority: dto.priority,
        title: dto.title,
        message: dto.message,
        relatedEntityType: 'announcement',
        relatedEntityId: announcement.id,
      });
    }

    return toAnnouncementResponse(announcement);
  }

  async findByIdInTenant(tenantId: string, id: string): Promise<AnnouncementResponseDto> {
    const announcement = await this.prisma.announcement.findFirst({ where: { id, tenantId }, include: announcementInclude });
    if (!announcement) {
      throw new NotFoundException('Announcement not found.');
    }
    return toAnnouncementResponse(announcement as AnnouncementWithRelations);
  }

  async list(tenantId: string, query: ListAnnouncementsQueryDto): Promise<PaginatedResult<AnnouncementResponseDto>> {
    const where = { tenantId };
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.announcement.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: announcementInclude,
      }),
      this.prisma.announcement.count({ where }),
    ]);
    return new PaginatedResult(items.map((a) => toAnnouncementResponse(a as AnnouncementWithRelations)), totalItems, query.page, query.limit);
  }

  /** The one place an audience shape resolves to actual recipient User ids — shared by the live preview and the real send, so they can never disagree. */
  private async resolveRecipientUserIds(
    tenantId: string,
    audience: AnnouncementAudience,
    planId?: string,
    memberIds?: string[],
  ): Promise<string[]> {
    switch (audience) {
      case AnnouncementAudience.ALL_MEMBERS: {
        const members = await this.prisma.member.findMany({ where: { tenantId, userId: { not: null } }, select: { userId: true } });
        return this.pluckUserIds(members);
      }
      case AnnouncementAudience.ACTIVE_MEMBERS: {
        const members = await this.prisma.member.findMany({
          where: { tenantId, status: 'ACTIVE', userId: { not: null } },
          select: { userId: true },
        });
        return this.pluckUserIds(members);
      }
      case AnnouncementAudience.EXPIRING_MEMBERS: {
        const today = todayUtc();
        const soon = addDays(today, EXPIRING_SOON_THRESHOLD_DAYS);
        const rows = await this.prisma.memberMembership.findMany({
          where: { tenantId, status: 'ACTIVE', startDate: { lte: today }, endDate: { gte: today, lte: soon } },
          distinct: ['memberId'],
          select: { member: { select: { userId: true } } },
        });
        return this.pluckUserIds(rows.map((r) => r.member));
      }
      case AnnouncementAudience.PLAN_MEMBERS: {
        if (!planId) {
          throw new BadRequestException('planId is required for the PLAN_MEMBERS audience.');
        }
        const today = todayUtc();
        const rows = await this.prisma.memberMembership.findMany({
          where: { tenantId, planId, status: 'ACTIVE', startDate: { lte: today }, endDate: { gte: today } },
          distinct: ['memberId'],
          select: { member: { select: { userId: true } } },
        });
        return this.pluckUserIds(rows.map((r) => r.member));
      }
      case AnnouncementAudience.ALL_TRAINERS: {
        const users = await this.prisma.user.findMany({ where: { tenantId, role: UserRole.TRAINER, status: 'ACTIVE' }, select: { id: true } });
        return users.map((u) => u.id);
      }
      case AnnouncementAudience.ALL_STAFF: {
        const users = await this.prisma.user.findMany({
          where: { tenantId, role: { in: [UserRole.MANAGER, UserRole.FRONT_DESK] }, status: 'ACTIVE' },
          select: { id: true },
        });
        return users.map((u) => u.id);
      }
      case AnnouncementAudience.TRAINERS_AND_STAFF: {
        const users = await this.prisma.user.findMany({
          where: { tenantId, role: { in: [UserRole.TRAINER, UserRole.MANAGER, UserRole.FRONT_DESK] }, status: 'ACTIVE' },
          select: { id: true },
        });
        return users.map((u) => u.id);
      }
      case AnnouncementAudience.SPECIFIC_MEMBERS: {
        if (!memberIds || memberIds.length === 0) {
          throw new BadRequestException('memberIds is required for the SPECIFIC_MEMBERS audience.');
        }
        const members = await this.prisma.member.findMany({
          where: { tenantId, id: { in: memberIds }, userId: { not: null } },
          select: { userId: true },
        });
        return this.pluckUserIds(members);
      }
    }
  }

  private pluckUserIds(rows: { userId: string | null }[]): string[] {
    return rows.map((r) => r.userId).filter((id): id is string => id !== null);
  }
}
