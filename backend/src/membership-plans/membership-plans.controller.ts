import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/types/jwt-payload.interface.js';
import { PermissionArea, PermissionLevel } from '../generated/prisma/enums.js';
import { RequirePermission } from '../authz/require-permission.decorator.js';
import { MembershipPlansService } from './membership-plans.service.js';
import { CreateMembershipPlanDto } from './dto/create-membership-plan.dto.js';
import { UpdateMembershipPlanDto } from './dto/update-membership-plan.dto.js';
import { ListMembershipPlansQueryDto } from './dto/list-membership-plans-query.dto.js';

/**
 * Reads (list/get) carry no permission gate — any authenticated tenant user
 * can browse plans, same reasoning as GET /trainers: a portal MEMBER needs
 * this to shop for/switch plans and has `NONE` on every PermissionArea (see
 * role-permissions.const.ts), so gating reads here would lock members out
 * entirely. The service itself still forces a MEMBER caller to ACTIVE-only
 * plans regardless of any filter passed. Writes are MEMBERSHIPS:MANAGE —
 * OWNER/MANAGER by default; this is gym business configuration.
 */
@ApiTags('membership-plans')
@ApiBearerAuth()
@Controller({ path: 'membership-plans', version: '1' })
export class MembershipPlansController {
  constructor(private readonly membershipPlansService: MembershipPlansService) {}

  @Get()
  @ApiOperation({ summary: "Browse the gym's membership plans.", description: 'A portal MEMBER only ever sees ACTIVE plans, regardless of the status filter.' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListMembershipPlansQueryDto) {
    return this.membershipPlansService.list(user.tenantId, query, { role: user.role });
  }

  @Post()
  @RequirePermission(PermissionArea.MEMBERSHIPS, PermissionLevel.MANAGE)
  @ApiOperation({ summary: 'Create a membership plan.' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateMembershipPlanDto) {
    return this.membershipPlansService.create(user.tenantId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'A single membership plan.' })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.membershipPlansService.findByIdInTenant(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermission(PermissionArea.MEMBERSHIPS, PermissionLevel.MANAGE)
  @ApiOperation({ summary: 'Update a plan — pricing, perks, description.' })
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateMembershipPlanDto) {
    return this.membershipPlansService.update(user.tenantId, id, dto);
  }

  @Post(':id/archive')
  @RequirePermission(PermissionArea.MEMBERSHIPS, PermissionLevel.MANAGE)
  @ApiOperation({
    summary: 'Archive a plan — hides it from new signups.',
    description: 'Existing members keep this plan until they renew or switch; nothing about their current membership changes.',
  })
  archive(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.membershipPlansService.archive(user.tenantId, id);
  }

  @Post(':id/activate')
  @RequirePermission(PermissionArea.MEMBERSHIPS, PermissionLevel.MANAGE)
  @ApiOperation({ summary: 'Reactivate an archived plan, making it available for new signups again.' })
  activate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.membershipPlansService.activate(user.tenantId, id);
  }
}
