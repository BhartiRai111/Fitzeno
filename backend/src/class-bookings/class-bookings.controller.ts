import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/types/jwt-payload.interface.js';
import { PermissionArea, PermissionLevel } from '../generated/prisma/enums.js';
import { RequirePermission } from '../authz/require-permission.decorator.js';
import { MembersService } from '../members/members.service.js';
import { ClassBookingsService } from './class-bookings.service.js';
import { CreateClassBookingDto, CreateClassBookingForMemberDto } from './dto/create-class-booking.dto.js';
import { ListClassBookingsQueryDto } from './dto/list-class-bookings-query.dto.js';

@ApiTags('class-bookings')
@ApiBearerAuth()
@Controller({ path: 'class-bookings', version: '1' })
export class ClassBookingsController {
  constructor(
    private readonly classBookingsService: ClassBookingsService,
    private readonly membersService: MembersService,
  ) {}

  @Post('me')
  @ApiOperation({ summary: 'Book a class as the caller — the member portal booking action. Waitlists automatically if the class is full.' })
  async bookAsSelf(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateClassBookingDto) {
    const memberId = await this.membersService.getOwnMemberId(user.tenantId, user.id);
    return this.classBookingsService.book(user.tenantId, dto.classOccurrenceId, memberId);
  }

  @Post('me/:id/cancel')
  @ApiOperation({ summary: 'Cancel one of the caller\'s own bookings.', description: 'A CONFIRMED booking can only be cancelled outside the cancellation window; a WAITLISTED one can be dropped any time.' })
  async cancelAsSelf(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const memberId = await this.membersService.getOwnMemberId(user.tenantId, user.id);
    return this.classBookingsService.cancel(user.tenantId, id, { memberId });
  }

  @Get('me')
  @ApiOperation({ summary: "The caller's own class bookings." })
  async listOwn(@CurrentUser() user: AuthenticatedUser, @Query() query: ListClassBookingsQueryDto) {
    const memberId = await this.membersService.getOwnMemberId(user.tenantId, user.id);
    return this.classBookingsService.listForMember(user.tenantId, memberId, query);
  }

  @Post()
  @RequirePermission(PermissionArea.BOOKINGS, PermissionLevel.MANAGE)
  @ApiOperation({ summary: 'Book a class on behalf of a member (front-desk / staff-assisted booking).' })
  bookForMember(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateClassBookingForMemberDto) {
    return this.classBookingsService.book(user.tenantId, dto.classOccurrenceId, dto.memberId);
  }

  @Get()
  @RequirePermission(PermissionArea.BOOKINGS, PermissionLevel.VIEW)
  @ApiOperation({ summary: 'List/search class bookings.', description: 'A TRAINER only ever sees bookings for classes they teach.' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListClassBookingsQueryDto) {
    return this.classBookingsService.list(user.tenantId, query, { id: user.id, role: user.role });
  }

  @Get('waitlist/:classOccurrenceId')
  @RequirePermission(PermissionArea.BOOKINGS, PermissionLevel.VIEW)
  @ApiOperation({ summary: "A class session's waitlist, in FIFO order." })
  waitlist(@CurrentUser() user: AuthenticatedUser, @Param('classOccurrenceId') classOccurrenceId: string) {
    return this.classBookingsService.waitlistForOccurrence(user.tenantId, classOccurrenceId);
  }

  @Post(':id/cancel')
  @RequirePermission(PermissionArea.BOOKINGS, PermissionLevel.MANAGE)
  @ApiOperation({ summary: "Cancel any member's booking (staff override — no cancellation-window restriction)." })
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.classBookingsService.cancel(user.tenantId, id);
  }

  @Post(':id/promote')
  @RequirePermission(PermissionArea.BOOKINGS, PermissionLevel.MANAGE)
  @ApiOperation({ summary: 'Manually promote a specific waitlisted booking to confirmed, skipping FIFO order.' })
  promote(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.classBookingsService.promote(user.tenantId, id);
  }
}
