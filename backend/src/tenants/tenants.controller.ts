import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { SkipTenantStatusCheck } from '../common/decorators/skip-tenant-status-check.decorator.js';
import type { AuthenticatedUser } from '../common/types/jwt-payload.interface.js';
import { PermissionArea, PermissionLevel, UserRole } from '../generated/prisma/enums.js';
import { RequirePermission } from '../authz/require-permission.decorator.js';
import { TenantsService } from './tenants.service.js';
import { UpdateTenantDto } from './dto/update-tenant.dto.js';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto.js';
import { UpdateTenantStatusDto } from './dto/update-tenant-status.dto.js';
import { toTenantResponse, type TenantResponseDto } from './dto/tenant-response.dto.js';
import { toTenantSettingsResponse, type TenantSettingsResponseDto } from './dto/tenant-settings-response.dto.js';

/**
 * "The current gym" — every route here resolves its tenant from the caller's
 * own JWT (`@CurrentUser().tenantId`), never a client-supplied id, so there
 * is no by-id endpoint to even attempt cross-tenant access against. Gym
 * *creation* lives on AuthController (`POST /auth/register-business`)
 * instead, alongside the other account-creation flows — see its own comment
 * for why that avoids a module dependency cycle.
 */
@ApiTags('tenants')
@ApiBearerAuth()
@Controller({ path: 'tenants', version: '1' })
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('me')
  @SkipTenantStatusCheck()
  @ApiOperation({ summary: "The caller's own gym — reachable even while paused/suspended, so the frontend can show why." })
  async getCurrent(@CurrentUser() user: AuthenticatedUser): Promise<TenantResponseDto> {
    const tenant = await this.tenantsService.findCurrent(user.tenantId);
    return toTenantResponse(tenant);
  }

  @Patch('me')
  @RequirePermission(PermissionArea.SETTINGS, PermissionLevel.MANAGE)
  @ApiOperation({ summary: "Update the gym's business profile." })
  async updateCurrent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateTenantDto,
  ): Promise<TenantResponseDto> {
    const tenant = await this.tenantsService.updateProfile(user.tenantId, dto);
    return toTenantResponse(tenant);
  }

  @Get('me/settings')
  @RequirePermission(PermissionArea.SETTINGS, PermissionLevel.VIEW)
  @ApiOperation({ summary: 'Operational settings: business hours, membership policy, payment methods, notification channels.' })
  async getSettings(@CurrentUser() user: AuthenticatedUser): Promise<TenantSettingsResponseDto> {
    const settings = await this.tenantsService.getSettings(user.tenantId);
    return toTenantSettingsResponse(settings);
  }

  @Patch('me/settings')
  @RequirePermission(PermissionArea.SETTINGS, PermissionLevel.MANAGE)
  @ApiOperation({ summary: 'Update one or more settings sections.' })
  async updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateTenantSettingsDto,
  ): Promise<TenantSettingsResponseDto> {
    const settings = await this.tenantsService.updateSettings(user.tenantId, dto);
    return toTenantSettingsResponse(settings);
  }

  @Patch('me/status')
  @Roles(UserRole.OWNER)
  @SkipTenantStatusCheck()
  @ApiOperation({
    summary: 'Pause or reactivate the gym.',
    description:
      "Owner only. A gym-wide lifecycle action, like changing someone's role — gated on the OWNER role directly rather than a permission area. Cannot lift a platform-level suspension.",
  })
  async updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateTenantStatusDto,
  ): Promise<TenantResponseDto> {
    const tenant = await this.tenantsService.updateStatus(user.tenantId, dto.status);
    return toTenantResponse(tenant);
  }
}
