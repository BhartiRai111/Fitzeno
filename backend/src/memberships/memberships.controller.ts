import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/types/jwt-payload.interface.js';
import { PermissionArea, PermissionLevel } from '../generated/prisma/enums.js';
import { RequirePermission } from '../authz/require-permission.decorator.js';
import { MembersService } from '../members/members.service.js';
import { MembershipsService } from './memberships.service.js';
import { CreateMembershipDto } from './dto/create-membership.dto.js';
import { PurchaseMembershipDto } from './dto/purchase-membership.dto.js';
import { RenewMembershipDto } from './dto/renew-membership.dto.js';
import { CancelMembershipDto } from './dto/cancel-membership.dto.js';
import { ListMembershipsQueryDto } from './dto/list-memberships-query.dto.js';

/**
 * Staff routes are gated on MEMBERSHIPS (reused unchanged from the
 * authz phase — OWNER/MANAGER manage by default, FRONT_DESK views only).
 * Every "me"/self route needs no permission at all — always the caller's
 * own data, same precedent as /members/me and /trainers/me.
 */
@ApiTags('memberships')
@ApiBearerAuth()
@Controller({ path: 'memberships', version: '1' })
export class MembershipsController {
  constructor(
    private readonly membershipsService: MembershipsService,
    private readonly membersService: MembersService,
  ) {}

  @Get()
  @RequirePermission(PermissionArea.MEMBERSHIPS, PermissionLevel.VIEW)
  @ApiOperation({ summary: 'List/search/filter membership records.', description: 'effectiveStatus (PENDING/ACTIVE/EXPIRING/EXPIRED/FROZEN/CANCELLED) is computed from dates, not a stored column — see MembershipResponseDto.' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListMembershipsQueryDto) {
    return this.membershipsService.list(user.tenantId, query);
  }

  @Post()
  @RequirePermission(PermissionArea.MEMBERSHIPS, PermissionLevel.MANAGE)
  @ApiOperation({ summary: 'Assign a new membership to a member.', description: 'Rejects if the member already holds a current (active/pending/frozen) membership — renew that instead.' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateMembershipDto) {
    return this.membershipsService.create(user.tenantId, dto);
  }

  @Get('stats')
  @RequirePermission(PermissionArea.MEMBERSHIPS, PermissionLevel.VIEW)
  @ApiOperation({ summary: 'Membership counts by effective status — active/expiring/pending/expired/frozen/cancelled.' })
  stats(@CurrentUser() user: AuthenticatedUser) {
    return this.membershipsService.getStats(user.tenantId);
  }

  @Get('me')
  @ApiOperation({ summary: "The caller's own current membership.", description: 'Null if they have never had one.' })
  async getOwnCurrent(@CurrentUser() user: AuthenticatedUser) {
    const memberId = await this.membersService.getOwnMemberId(user.tenantId, user.id);
    return this.membershipsService.getCurrentForMember(user.tenantId, memberId);
  }

  @Post('me')
  @ApiOperation({ summary: 'Purchase or renew — the member-portal action.', description: "Renews the caller's current membership if they have one (optionally switching plans), otherwise starts a brand new one." })
  purchaseOrRenew(@CurrentUser() user: AuthenticatedUser, @Body() dto: PurchaseMembershipDto) {
    return this.membershipsService.purchaseOrRenewForSelf(user.tenantId, user.id, dto);
  }

  @Get('me/history')
  @ApiOperation({ summary: "The caller's own full membership history." })
  async getOwnHistory(@CurrentUser() user: AuthenticatedUser, @Query() query: ListMembershipsQueryDto) {
    const memberId = await this.membersService.getOwnMemberId(user.tenantId, user.id);
    return this.membershipsService.getHistoryForMember(user.tenantId, memberId, query);
  }

  @Get('member/:memberId/current')
  @RequirePermission(PermissionArea.MEMBERSHIPS, PermissionLevel.VIEW)
  @ApiOperation({ summary: "A specific member's current membership." })
  getCurrentForMember(@CurrentUser() user: AuthenticatedUser, @Param('memberId') memberId: string) {
    return this.membershipsService.getCurrentForMember(user.tenantId, memberId);
  }

  @Get('member/:memberId/history')
  @RequirePermission(PermissionArea.MEMBERSHIPS, PermissionLevel.VIEW)
  @ApiOperation({ summary: "A specific member's full membership history." })
  getHistoryForMember(@CurrentUser() user: AuthenticatedUser, @Param('memberId') memberId: string, @Query() query: ListMembershipsQueryDto) {
    return this.membershipsService.getHistoryForMember(user.tenantId, memberId, query);
  }

  @Get(':id')
  @RequirePermission(PermissionArea.MEMBERSHIPS, PermissionLevel.VIEW)
  @ApiOperation({ summary: 'A single membership record.' })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.membershipsService.findByIdInTenant(user.tenantId, id);
  }

  @Post(':id/renew')
  @RequirePermission(PermissionArea.MEMBERSHIPS, PermissionLevel.MANAGE)
  @ApiOperation({ summary: 'Renew a membership — a new period, optionally on a different plan.' })
  renew(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: RenewMembershipDto) {
    return this.membershipsService.renew(user.tenantId, id, dto);
  }

  @Post(':id/freeze')
  @RequirePermission(PermissionArea.MEMBERSHIPS, PermissionLevel.MANAGE)
  @ApiOperation({ summary: 'Freeze/pause a currently active membership.' })
  freeze(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.membershipsService.freeze(user.tenantId, id);
  }

  @Post(':id/unfreeze')
  @RequirePermission(PermissionArea.MEMBERSHIPS, PermissionLevel.MANAGE)
  @ApiOperation({ summary: 'Unfreeze a membership — extends its end date by the days spent frozen.' })
  unfreeze(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.membershipsService.unfreeze(user.tenantId, id);
  }

  @Post(':id/cancel')
  @RequirePermission(PermissionArea.MEMBERSHIPS, PermissionLevel.MANAGE)
  @ApiOperation({ summary: 'Cancel a membership — takes effect immediately.' })
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CancelMembershipDto) {
    return this.membershipsService.cancel(user.tenantId, id, dto.reason);
  }
}
