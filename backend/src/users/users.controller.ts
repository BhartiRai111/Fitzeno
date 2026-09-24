import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../common/types/jwt-payload.interface.js';
import { PermissionArea, PermissionLevel, UserRole } from '../generated/prisma/enums.js';
import { PermissionsService } from '../authz/permissions.service.js';
import { RequirePermission } from '../authz/require-permission.decorator.js';
import { UsersService } from './users.service.js';
import { InviteUserDto } from './dto/invite-user.dto.js';
import { ListUsersQueryDto } from './dto/list-users-query.dto.js';
import { SetPermissionOverridesDto } from './dto/set-permission-overrides.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { UpdateStatusDto } from './dto/update-status.dto.js';
import { toUserResponse, type UserResponseDto } from './dto/user-response.dto.js';

/**
 * The staff/team directory — listing, inviting, and managing OTHER users'
 * status/role/permissions. Every "manage someone else" action is gated by
 * the `staff` PermissionArea (matches the frontend's Staff & Permissions
 * page: MANAGER gets staff:VIEW, so they can see the team but not touch
 * roles/status/permissions; only OWNER gets staff:MANAGE). Actions on your
 * OWN record (viewing/editing your own profile) are always allowed —
 * that's an ownership check done in the handler, not the permission system,
 * since "is this me" isn't something a role/area check can express.
 */
@ApiTags('users')
@ApiBearerAuth()
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly permissionsService: PermissionsService,
  ) {}

  @Get()
  @RequirePermission(PermissionArea.STAFF, PermissionLevel.VIEW)
  @ApiOperation({ summary: "List the current tenant's users (the staff/team directory)." })
  list(@CurrentUser() currentUser: AuthenticatedUser, @Query() query: ListUsersQueryDto) {
    return this.usersService.list(currentUser.tenantId, query, {
      role: query.role,
      status: query.status,
    });
  }

  @Post('invite')
  @RequirePermission(PermissionArea.STAFF, PermissionLevel.MANAGE)
  @ApiOperation({
    summary: 'Invite a new staff member.',
    description:
      'Creates the account immediately with status INVITED and no usable password, and issues a set-password token the same way forgot-password does. Wiring up the email that carries that link is a follow-up integration; for now the link is logged server-side.',
  })
  async invite(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: InviteUserDto,
  ): Promise<UserResponseDto> {
    if (dto.role === UserRole.MEMBER) {
      throw new ForbiddenException('Member accounts are created via public registration, not invited.');
    }
    const user = await this.usersService.createInvite({
      tenantId: currentUser.tenantId,
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      role: dto.role,
    });
    return toUserResponse(user);
  }

  @Get(':id')
  @ApiOperation({ summary: "Get a user's profile — your own always, anyone else's with staff:VIEW." })
  async getOne(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<UserResponseDto> {
    await this.assertSelfOrPermission(currentUser, id, PermissionLevel.VIEW);
    const user = await this.usersService.findByIdInTenant(currentUser.tenantId, id);
    return toUserResponse(user);
  }

  @Patch(':id')
  @ApiOperation({ summary: "Update a user's profile — your own always, anyone else's with staff:MANAGE." })
  async updateProfile(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    await this.assertSelfOrPermission(currentUser, id, PermissionLevel.MANAGE);
    const user = await this.usersService.updateProfile(currentUser.tenantId, id, dto);
    return toUserResponse(user);
  }

  @Patch(':id/status')
  @RequirePermission(PermissionArea.STAFF, PermissionLevel.MANAGE)
  @ApiOperation({ summary: "Activate/deactivate a user's account." })
  async updateStatus(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.setStatus(currentUser.tenantId, id, dto.status);
    return toUserResponse(user);
  }

  @Patch(':id/role')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: "Change a user's role. Owner only — role changes affect the whole permission model." })
  async updateRole(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.setRole(currentUser.tenantId, id, dto.role);
    return toUserResponse(user);
  }

  @Get(':id/permissions')
  @ApiOperation({ summary: 'Effective permissions for a user (role defaults merged with their overrides).' })
  async getPermissions(@CurrentUser() currentUser: AuthenticatedUser, @Param('id') id: string) {
    await this.assertSelfOrPermission(currentUser, id, PermissionLevel.VIEW);
    const user = await this.usersService.findByIdInTenant(currentUser.tenantId, id);
    return this.permissionsService.getEffectivePermissions(user.id, user.role);
  }

  @Put(':id/permissions')
  @RequirePermission(PermissionArea.STAFF, PermissionLevel.MANAGE)
  @ApiOperation({ summary: "Replace a user's permission overrides." })
  async setPermissions(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SetPermissionOverridesDto,
  ) {
    await this.usersService.setPermissionOverrides(currentUser.tenantId, id, dto.overrides);
    const user = await this.usersService.findByIdInTenant(currentUser.tenantId, id);
    return this.permissionsService.getEffectivePermissions(user.id, user.role);
  }

  private async assertSelfOrPermission(
    currentUser: AuthenticatedUser,
    targetId: string,
    minLevel: PermissionLevel,
  ): Promise<void> {
    if (currentUser.id === targetId) {
      return;
    }
    const allowed = await this.permissionsService.hasPermission(
      currentUser.id,
      currentUser.role,
      PermissionArea.STAFF,
      minLevel,
    );
    if (!allowed) {
      throw new ForbiddenException("You don't have permission to access this user.");
    }
  }
}
