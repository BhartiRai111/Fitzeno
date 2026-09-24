import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/types/jwt-payload.interface.js';
import { PermissionArea, PermissionLevel } from '../generated/prisma/enums.js';
import { RequirePermission } from '../authz/require-permission.decorator.js';
import { AnnouncementsService } from './announcements.service.js';
import { CreateAnnouncementDto } from './dto/create-announcement.dto.js';
import { ListAnnouncementsQueryDto } from './dto/list-announcements-query.dto.js';
import { AudienceCountQueryDto } from './dto/audience-count-query.dto.js';

/** Gated on the existing ANNOUNCEMENTS PermissionArea unchanged (OWNER/MANAGER manage by default, everyone else none) — reused from the authz phase, not a new area. */
@ApiTags('announcements')
@ApiBearerAuth()
@Controller({ path: 'announcements', version: '1' })
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Get()
  @RequirePermission(PermissionArea.ANNOUNCEMENTS, PermissionLevel.VIEW)
  @ApiOperation({ summary: 'List previously sent announcements, newest first.' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListAnnouncementsQueryDto) {
    return this.announcementsService.list(user.tenantId, query);
  }

  @Post()
  @RequirePermission(PermissionArea.ANNOUNCEMENTS, PermissionLevel.MANAGE)
  @ApiOperation({ summary: 'Send an announcement to a resolved audience.', description: 'Delivery is immediate and in-app only — every eligible recipient gets one Notification (category ANNOUNCEMENT), respecting their own ANNOUNCEMENT preference.' })
  send(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAnnouncementDto) {
    return this.announcementsService.send(user.tenantId, user.id, dto);
  }

  @Get('audience-count')
  @RequirePermission(PermissionArea.ANNOUNCEMENTS, PermissionLevel.VIEW)
  @ApiOperation({ summary: 'A live recipient-count preview for a given audience — matches SendNotificationDialog\'s "~N recipients" estimate exactly.' })
  audienceCount(@CurrentUser() user: AuthenticatedUser, @Query() query: AudienceCountQueryDto) {
    return this.announcementsService.getAudienceCount(user.tenantId, query.audience, query.planId, query.memberIds);
  }

  @Get(':id')
  @RequirePermission(PermissionArea.ANNOUNCEMENTS, PermissionLevel.VIEW)
  @ApiOperation({ summary: 'A single sent announcement.' })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.announcementsService.findByIdInTenant(user.tenantId, id);
  }
}
