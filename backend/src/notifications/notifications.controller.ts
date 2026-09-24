import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/types/jwt-payload.interface.js';
import { NotificationsService } from './notifications.service.js';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto.js';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto.js';

/**
 * Every route here is a "me" route with no permission gate — a
 * notification is always strictly personal (see the Notification model's
 * own comment: there is no staff view of another user's notifications, so
 * ownership is enforced by scoping every query to the caller's own id
 * rather than a separate permission check).
 */
@ApiTags('notifications')
@ApiBearerAuth()
@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('me')
  @ApiOperation({ summary: "The caller's own notifications, newest first.", description: 'Paginated — never returns unlimited history in one call.' })
  listOwn(@CurrentUser() user: AuthenticatedUser, @Query() query: ListNotificationsQueryDto) {
    return this.notificationsService.listOwn(user.tenantId, user.id, query);
  }

  @Get('me/unread-count')
  @ApiOperation({ summary: 'The caller\'s unread notification count — for a topbar bell badge.' })
  async unreadCount(@CurrentUser() user: AuthenticatedUser) {
    return { count: await this.notificationsService.unreadCount(user.tenantId, user.id) };
  }

  @Get('me/preferences')
  @ApiOperation({ summary: "The caller's notification preferences, scoped to the categories their role can toggle." })
  getPreferences(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.getPreferences(user.tenantId, user.id, user.role);
  }

  @Patch('me/preferences')
  @ApiOperation({ summary: 'Update one or more notification category preferences.', description: 'Rejects a category not available to the caller\'s role, and rejects disabling a non-toggleable category (see the response\'s own toggleable flag).' })
  updatePreferences(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateNotificationPreferencesDto) {
    return this.notificationsService.updatePreferences(user.tenantId, user.id, user.role, dto);
  }

  @Post('me/read-all')
  @ApiOperation({ summary: 'Mark every unread notification of the caller\'s as read.' })
  markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllRead(user.tenantId, user.id);
  }

  @Get('me/:id')
  @ApiOperation({ summary: 'A single notification of the caller\'s own.' })
  findOwnOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.notificationsService.findOwnByIdInTenant(user.tenantId, user.id, id);
  }

  @Post('me/:id/read')
  @ApiOperation({ summary: 'Mark a single notification as read.' })
  markRead(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.notificationsService.markRead(user.tenantId, user.id, id);
  }
}
