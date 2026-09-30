import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../common/types/jwt-payload.interface.js';
import { CheckInMethod, PermissionArea, PermissionLevel, UserRole } from '../generated/prisma/enums.js';
import { RequirePermission } from '../authz/require-permission.decorator.js';
import { MembersService } from '../members/members.service.js';
import { AttendanceService } from './attendance.service.js';
import { CreateCheckInDto } from './dto/create-check-in.dto.js';
import { RedeemCheckInTokenDto } from './dto/redeem-check-in-token.dto.js';
import { ListAttendanceQueryDto } from './dto/list-attendance-query.dto.js';
import { AttendanceStatsQueryDto } from './dto/attendance-stats-query.dto.js';
import { InactiveMembersQueryDto } from './dto/inactive-members-query.dto.js';

/** Front-of-house staff roles allowed to operate the gym-wide check-in desk and view gym-wide attendance data — deliberately excludes TRAINER, whose ATTENDANCE:MANAGE permission (see role-permissions.const.ts) exists only to let them mark their OWN class/PT roster (see ClassBookingsController/PtSessionsController), never to see or drive the whole gym's check-ins. */
const FRONT_DESK_ROLES = [UserRole.OWNER, UserRole.MANAGER, UserRole.FRONT_DESK] as const;

@ApiTags('attendance')
@ApiBearerAuth()
@Controller({ path: 'attendance', version: '1' })
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly membersService: MembersService,
  ) {}

  // -----------------------------------------------------------------------
  // Self-service (member)
  // -----------------------------------------------------------------------

  @Get('check-in/token')
  @ApiOperation({
    summary: 'Issue a short-lived, single-use QR check-in token for the caller.',
    description: 'Encode the returned token as a QR code — a staff-operated reader redeems it via POST /attendance/check-in/redeem. Expires in 45 seconds.',
  })
  async issueToken(@CurrentUser() user: AuthenticatedUser) {
    const memberId = await this.membersService.getOwnMemberId(user.tenantId, user.id);
    return this.attendanceService.issueCheckInToken(user.tenantId, memberId);
  }

  @Post('check-in/me')
  @ApiOperation({ summary: 'Self check-in as the caller (the member-portal "scan & check in" action).' })
  async checkInSelf(@CurrentUser() user: AuthenticatedUser) {
    const memberId = await this.membersService.getOwnMemberId(user.tenantId, user.id);
    return this.attendanceService.performCheckIn(user.tenantId, memberId, CheckInMethod.QR, null);
  }

  @Post('check-out/me')
  @ApiOperation({ summary: "Check out of the caller's own currently-open visit." })
  async checkOutSelf(@CurrentUser() user: AuthenticatedUser) {
    const memberId = await this.membersService.getOwnMemberId(user.tenantId, user.id);
    return this.attendanceService.checkOutSelf(user.tenantId, memberId);
  }

  @Get('status/me')
  @ApiOperation({ summary: "The caller's current check-in status." })
  async statusSelf(@CurrentUser() user: AuthenticatedUser) {
    const memberId = await this.membersService.getOwnMemberId(user.tenantId, user.id);
    return this.attendanceService.getStatus(user.tenantId, memberId);
  }

  @Get('history/me')
  @ApiOperation({ summary: "The caller's own attendance history." })
  async historySelf(@CurrentUser() user: AuthenticatedUser, @Query() query: ListAttendanceQueryDto) {
    const memberId = await this.membersService.getOwnMemberId(user.tenantId, user.id);
    return this.attendanceService.historyForMember(user.tenantId, memberId, query);
  }

  // -----------------------------------------------------------------------
  // Front desk / staff
  // -----------------------------------------------------------------------

  @Post('check-in/redeem')
  @Roles(...FRONT_DESK_ROLES)
  @RequirePermission(PermissionArea.ATTENDANCE, PermissionLevel.MANAGE)
  @ApiOperation({ summary: "Redeem a member's QR check-in token (the staff-operated kiosk/reader side of the flow)." })
  redeemToken(@CurrentUser() user: AuthenticatedUser, @Body() dto: RedeemCheckInTokenDto) {
    return this.attendanceService.redeemCheckInToken(user.tenantId, dto.token, user.id);
  }

  @Post()
  @Roles(...FRONT_DESK_ROLES)
  @RequirePermission(PermissionArea.ATTENDANCE, PermissionLevel.MANAGE)
  @ApiOperation({ summary: "Manual front-desk check-in on a member's behalf (forgotten phone, code won't scan, etc.)." })
  checkIn(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCheckInDto) {
    return this.attendanceService.performCheckIn(user.tenantId, dto.memberId, dto.method ?? CheckInMethod.MANUAL, user.id);
  }

  @Get('today')
  @Roles(...FRONT_DESK_ROLES)
  @RequirePermission(PermissionArea.ATTENDANCE, PermissionLevel.VIEW)
  @ApiOperation({ summary: "Today's check-ins, plus who's currently still in the gym." })
  today(@CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.today(user.tenantId);
  }

  @Get('stats')
  @Roles(...FRONT_DESK_ROLES)
  @RequirePermission(PermissionArea.ATTENDANCE, PermissionLevel.VIEW)
  @ApiOperation({ summary: 'Day-bucketed visit counts over a date range — powers weekly/monthly attendance trend charts.' })
  stats(@CurrentUser() user: AuthenticatedUser, @Query() query: AttendanceStatsQueryDto) {
    return this.attendanceService.stats(user.tenantId, query);
  }

  @Get('inactive-members')
  @Roles(...FRONT_DESK_ROLES)
  @RequirePermission(PermissionArea.ATTENDANCE, PermissionLevel.VIEW)
  @ApiOperation({ summary: 'Active members with no check-in in the last N days — raw material for a future retention feature.' })
  inactiveMembers(@CurrentUser() user: AuthenticatedUser, @Query() query: InactiveMembersQueryDto) {
    return this.attendanceService.inactiveMembers(user.tenantId, query.days);
  }

  @Get()
  @Roles(...FRONT_DESK_ROLES)
  @RequirePermission(PermissionArea.ATTENDANCE, PermissionLevel.VIEW)
  @ApiOperation({ summary: 'List/search gym check-ins — history, by member, date range, method, open/closed.' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListAttendanceQueryDto) {
    return this.attendanceService.history(user.tenantId, query);
  }

  @Post(':id/check-out')
  @Roles(...FRONT_DESK_ROLES)
  @RequirePermission(PermissionArea.ATTENDANCE, PermissionLevel.MANAGE)
  @ApiOperation({ summary: "Staff override: check out any member's open visit by its check-in id." })
  checkOutById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.attendanceService.checkOutById(user.tenantId, id);
  }
}
