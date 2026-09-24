import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { PaginatedResult } from '../common/dto/pagination-query.dto.js';
import { NotificationCategory, NotificationPriority, UserRole } from '../generated/prisma/enums.js';
import { NON_TOGGLEABLE_CATEGORIES, ROLE_NOTIFICATION_CATEGORIES } from './notification-rules.const.js';
import { toNotificationResponse, type NotificationResponseDto } from './dto/notification-response.dto.js';
import type { NotificationPreferenceResponseDto } from './dto/notification-preference-response.dto.js';
import type { ListNotificationsQueryDto } from './dto/list-notifications-query.dto.js';
import type { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto.js';

export interface NotifyParams {
  category: NotificationCategory;
  priority?: NotificationPriority;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  actionUrl?: string;
  /** Set only for scheduled/reminder notifications that must fire at most once per (recipient, milestone) — see the Notification model's own comment. */
  dedupKey?: string;
}

/**
 * The one place a Notification row is ever created — every business-module
 * trigger (NotificationsEventListener), the scheduler
 * (NotificationsSchedulerService), and Announcements all funnel through
 * `notify()` (or its single-recipient convenience wrappers), so preference
 * enforcement lives in exactly one place rather than being re-checked (or
 * forgotten) per caller.
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------------
  // Write side — used by NotificationsEventListener, the scheduler, and
  // AnnouncementsService. Never called directly by a controller.
  // -------------------------------------------------------------------

  /** Direct-user recipient (a trainer, a staff member, or a member's own login id already resolved). */
  async notifyUser(tenantId: string, userId: string, params: NotifyParams): Promise<void> {
    await this.notify(tenantId, [userId], params);
  }

  /**
   * A Member-shaped recipient — resolves to their linked login and no-ops
   * if they don't have one (a member with no portal account has nothing to
   * receive an in-app notification with; this is a normal, silent case,
   * not an error).
   */
  async notifyMember(tenantId: string, memberId: string, params: NotifyParams): Promise<void> {
    await this.notifyMembers(tenantId, [memberId], params);
  }

  async notifyMembers(tenantId: string, memberIds: string[], params: NotifyParams): Promise<void> {
    if (memberIds.length === 0) return;
    const members = await this.prisma.member.findMany({
      where: { tenantId, id: { in: memberIds }, userId: { not: null } },
      select: { userId: true },
    });
    const userIds = members.map((m) => m.userId).filter((id): id is string => id !== null);
    await this.notify(tenantId, userIds, params);
  }

  /** A broadcast to every active staff user holding one of the given roles — used for business-critical alerts (payment failures, unassigned lead follow-ups), not for Announcements (which has its own richer audience resolver). */
  async notifyUsersByRoles(tenantId: string, roles: UserRole[], params: NotifyParams): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: { tenantId, role: { in: roles }, status: 'ACTIVE' },
      select: { id: true },
    });
    await this.notify(tenantId, users.map((u) => u.id), params);
  }

  /**
   * The shared core: filters out recipients who've disabled this category,
   * then bulk-inserts the rest in one query. `skipDuplicates` lets a
   * dedup-keyed reminder be safely re-attempted (e.g. a scheduler run that
   * partially completed before a restart) without a separate existence
   * check — the unique `(recipientUserId, dedupKey)` constraint does that
   * work at the database level. Public (not just the wrappers above)
   * because AnnouncementsService resolves its own arbitrary recipient list
   * (staff/trainer/member audiences it already knows how to query) and has
   * no need to re-resolve through notifyMember/notifyUsersByRoles.
   */
  async notify(tenantId: string, recipientUserIds: string[], params: NotifyParams): Promise<void> {
    const uniqueIds = [...new Set(recipientUserIds)];
    if (uniqueIds.length === 0) return;

    const eligibleIds = await this.filterByPreference(uniqueIds, params.category);
    if (eligibleIds.length === 0) return;

    await this.prisma.notification.createMany({
      data: eligibleIds.map((recipientUserId) => ({
        tenantId,
        recipientUserId,
        category: params.category,
        priority: params.priority ?? NotificationPriority.MEDIUM,
        title: params.title,
        message: params.message,
        relatedEntityType: params.relatedEntityType,
        relatedEntityId: params.relatedEntityId,
        actionUrl: params.actionUrl,
        dedupKey: params.dedupKey,
      })),
      skipDuplicates: true,
    });
  }

  /** SYSTEM (and any other non-toggleable category) always passes; everything else is opted out only by an explicit disabled preference row. */
  private async filterByPreference(userIds: string[], category: NotificationCategory): Promise<string[]> {
    if (NON_TOGGLEABLE_CATEGORIES.includes(category)) {
      return userIds;
    }
    const disabled = await this.prisma.notificationPreference.findMany({
      where: { userId: { in: userIds }, category, enabled: false },
      select: { userId: true },
    });
    const disabledIds = new Set(disabled.map((d) => d.userId));
    return userIds.filter((id) => !disabledIds.has(id));
  }

  // -------------------------------------------------------------------
  // Read side — the in-app notification center.
  // -------------------------------------------------------------------

  async listOwn(tenantId: string, userId: string, query: ListNotificationsQueryDto): Promise<PaginatedResult<NotificationResponseDto>> {
    const where = {
      tenantId,
      recipientUserId: userId,
      ...(query.category ? { category: query.category } : {}),
      ...(query.unread === true ? { readAt: null } : {}),
      ...(query.unread === false ? { readAt: { not: null } } : {}),
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return new PaginatedResult(items.map(toNotificationResponse), totalItems, query.page, query.limit);
  }

  async unreadCount(tenantId: string, userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { tenantId, recipientUserId: userId, readAt: null } });
  }

  /** Scoped by (tenantId, recipientUserId) in the query itself — a notification belonging to someone else 404s exactly like a cross-tenant one; there is no "staff view of another user's notifications" to distinguish with a 403. */
  async findOwnByIdInTenant(tenantId: string, userId: string, id: string): Promise<NotificationResponseDto> {
    const notification = await this.prisma.notification.findFirst({ where: { id, tenantId, recipientUserId: userId } });
    if (!notification) {
      throw new NotFoundException('Notification not found.');
    }
    return toNotificationResponse(notification);
  }

  async markRead(tenantId: string, userId: string, id: string): Promise<NotificationResponseDto> {
    const result = await this.prisma.notification.updateMany({
      where: { id, tenantId, recipientUserId: userId, readAt: null },
      data: { readAt: new Date() },
    });
    if (result.count === 0) {
      // Either it doesn't exist/isn't theirs, or it's already read — the
      // latter is idempotent, not an error, so only 404 when the row
      // genuinely isn't theirs to read.
      const exists = await this.prisma.notification.findFirst({ where: { id, tenantId, recipientUserId: userId } });
      if (!exists) {
        throw new NotFoundException('Notification not found.');
      }
    }
    return this.findOwnByIdInTenant(tenantId, userId, id);
  }

  async markAllRead(tenantId: string, userId: string): Promise<{ updated: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { tenantId, recipientUserId: userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  // -------------------------------------------------------------------
  // Preferences
  // -------------------------------------------------------------------

  async getPreferences(tenantId: string, userId: string, role: UserRole): Promise<NotificationPreferenceResponseDto[]> {
    const categories = ROLE_NOTIFICATION_CATEGORIES[role];
    const overrides = await this.prisma.notificationPreference.findMany({
      where: { tenantId, userId, category: { in: categories } },
    });
    const overrideByCategory = new Map(overrides.map((o) => [o.category, o.enabled]));

    return categories.map((category) => ({
      category,
      enabled: overrideByCategory.get(category) ?? true,
      toggleable: !NON_TOGGLEABLE_CATEGORIES.includes(category),
    }));
  }

  async updatePreferences(
    tenantId: string,
    userId: string,
    role: UserRole,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferenceResponseDto[]> {
    const allowedCategories = new Set(ROLE_NOTIFICATION_CATEGORIES[role]);

    for (const item of dto.preferences) {
      if (!allowedCategories.has(item.category)) {
        throw new BadRequestException(`${item.category} is not a notification category available to your role.`);
      }
      if (NON_TOGGLEABLE_CATEGORIES.includes(item.category) && !item.enabled) {
        throw new BadRequestException(`${item.category} notifications cannot be disabled.`);
      }
    }

    await this.prisma.$transaction(
      dto.preferences.map((item) =>
        this.prisma.notificationPreference.upsert({
          where: { userId_category: { userId, category: item.category } },
          create: { tenantId, userId, category: item.category, enabled: item.enabled },
          update: { enabled: item.enabled },
        }),
      ),
    );

    return this.getPreferences(tenantId, userId, role);
  }
}
