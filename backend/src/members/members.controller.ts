import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/types/jwt-payload.interface.js';
import { PermissionArea, PermissionLevel } from '../generated/prisma/enums.js';
import { RequirePermission } from '../authz/require-permission.decorator.js';
import { MembersService } from './members.service.js';
import { CreateMemberDto } from './dto/create-member.dto.js';
import { UpdateMemberDto } from './dto/update-member.dto.js';
import { ListMembersQueryDto } from './dto/list-members-query.dto.js';
import { AddMemberNoteDto } from './dto/add-member-note.dto.js';

/**
 * Members & Leads share one PermissionArea in the approved frontend
 * (src/lib/permissions.ts's "members" area covers "Member profiles,
 * contact info, and lead follow-up") — mirrored here rather than inventing
 * a second area, so `MEMBERS` gates both this controller and LeadsController.
 */
@ApiTags('members')
@ApiBearerAuth()
@Controller({ path: 'members', version: '1' })
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @RequirePermission(PermissionArea.MEMBERS, PermissionLevel.VIEW)
  @ApiOperation({ summary: "List/search/filter the gym's members.", description: 'A TRAINER only ever sees members assigned to them, regardless of filters.' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListMembersQueryDto) {
    return this.membersService.list(
      user.tenantId,
      query,
      { status: query.status, trainerId: query.trainerId },
      { id: user.id, role: user.role },
    );
  }

  @Post()
  @RequirePermission(PermissionArea.MEMBERS, PermissionLevel.MANAGE)
  @ApiOperation({ summary: 'Add a member directly (walk-in) — for a lead converting, see POST /leads/:id/convert instead.' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateMemberDto) {
    return this.membersService.create(user.tenantId, dto);
  }

  @Get('me')
  @ApiOperation({ summary: "The caller's own member profile — the member portal's entry point. No members:view permission required; this is always your own data." })
  getOwnProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.membersService.findOwnProfile(user.tenantId, user.id);
  }

  @Get(':id')
  @RequirePermission(PermissionArea.MEMBERS, PermissionLevel.VIEW)
  @ApiOperation({ summary: 'A single member profile, with notes.' })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.membersService.findByIdInTenant(user.tenantId, id, { id: user.id, role: user.role });
  }

  @Patch(':id')
  @RequirePermission(PermissionArea.MEMBERS, PermissionLevel.MANAGE)
  @ApiOperation({ summary: 'Update a member — profile fields, status, or trainer assignment.' })
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateMemberDto) {
    return this.membersService.update(user.tenantId, id, dto);
  }

  @Post(':id/notes')
  @RequirePermission(PermissionArea.MEMBERS, PermissionLevel.MANAGE)
  @ApiOperation({ summary: 'Add a note to a member.' })
  addNote(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AddMemberNoteDto) {
    return this.membersService.addNote(user.tenantId, id, user.id, dto.body);
  }
}
