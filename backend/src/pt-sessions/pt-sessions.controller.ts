import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/types/jwt-payload.interface.js';
import { PermissionArea, PermissionLevel } from '../generated/prisma/enums.js';
import { RequirePermission } from '../authz/require-permission.decorator.js';
import { MembersService } from '../members/members.service.js';
import { PtSessionsService } from './pt-sessions.service.js';
import { CreatePtSessionDto, CreatePtSessionForMemberDto } from './dto/create-pt-session.dto.js';
import { ReschedulePtSessionDto } from './dto/reschedule-pt-session.dto.js';
import { ListPtSessionsQueryDto } from './dto/list-pt-sessions-query.dto.js';
import { AvailableSlotsQueryDto } from './dto/available-slots-query.dto.js';

@ApiTags('pt-sessions')
@ApiBearerAuth()
@Controller({ path: 'pt-sessions', version: '1' })
export class PtSessionsController {
  constructor(
    private readonly ptSessionsService: PtSessionsService,
    private readonly membersService: MembersService,
  ) {}

  @Get('available-slots')
  @ApiOperation({ summary: "A trainer's free Personal Training windows on a given date." })
  getAvailableSlots(@Query() query: AvailableSlotsQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.ptSessionsService.getAvailableSlots(user.tenantId, query.trainerId, query.date);
  }

  @Post('me')
  @ApiOperation({ summary: 'Book a personal training session as the caller.' })
  async bookAsSelf(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePtSessionDto) {
    const memberId = await this.membersService.getOwnMemberId(user.tenantId, user.id);
    return this.ptSessionsService.book(user.tenantId, dto.trainerId, memberId, dto);
  }

  @Patch('me/:id')
  @ApiOperation({ summary: 'Reschedule one of the caller\'s own sessions.' })
  async rescheduleAsSelf(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ReschedulePtSessionDto) {
    const memberId = await this.membersService.getOwnMemberId(user.tenantId, user.id);
    return this.ptSessionsService.reschedule(user.tenantId, id, dto, { memberId });
  }

  @Post('me/:id/cancel')
  @ApiOperation({ summary: 'Cancel one of the caller\'s own sessions.', description: 'Only outside the cancellation window.' })
  async cancelAsSelf(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const memberId = await this.membersService.getOwnMemberId(user.tenantId, user.id);
    return this.ptSessionsService.cancel(user.tenantId, id, { memberId });
  }

  @Get('me')
  @ApiOperation({ summary: "The caller's own personal training sessions." })
  async listOwn(@CurrentUser() user: AuthenticatedUser, @Query() query: ListPtSessionsQueryDto) {
    const memberId = await this.membersService.getOwnMemberId(user.tenantId, user.id);
    return this.ptSessionsService.listForMember(user.tenantId, memberId, query);
  }

  @Post()
  @RequirePermission(PermissionArea.BOOKINGS, PermissionLevel.MANAGE)
  @ApiOperation({ summary: 'Book a personal training session on behalf of a member (staff-assisted booking).' })
  bookForMember(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePtSessionForMemberDto) {
    return this.ptSessionsService.book(user.tenantId, dto.trainerId, dto.memberId, dto);
  }

  @Get()
  @RequirePermission(PermissionArea.BOOKINGS, PermissionLevel.VIEW)
  @ApiOperation({ summary: 'List/search personal training sessions.', description: 'A TRAINER only ever sees their own sessions.' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListPtSessionsQueryDto) {
    return this.ptSessionsService.list(user.tenantId, query, { id: user.id, role: user.role });
  }

  @Patch(':id')
  @RequirePermission(PermissionArea.BOOKINGS, PermissionLevel.MANAGE)
  @ApiOperation({ summary: "Reschedule any member's session (staff override)." })
  reschedule(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ReschedulePtSessionDto) {
    return this.ptSessionsService.reschedule(user.tenantId, id, dto);
  }

  @Post(':id/cancel')
  @RequirePermission(PermissionArea.BOOKINGS, PermissionLevel.MANAGE)
  @ApiOperation({ summary: "Cancel any member's session (staff override — no cancellation-window restriction)." })
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ptSessionsService.cancel(user.tenantId, id);
  }
}
