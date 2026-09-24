import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/types/jwt-payload.interface.js';
import { PermissionArea, PermissionLevel } from '../generated/prisma/enums.js';
import { RequirePermission } from '../authz/require-permission.decorator.js';
import { RefundsService } from './refunds.service.js';
import { ListRefundsQueryDto } from './dto/list-refunds-query.dto.js';

/** Read-only — a refund is issued via POST /transactions/:id/refund; this controller just makes them a searchable resource for the owner's Refunds tab. */
@ApiTags('refunds')
@ApiBearerAuth()
@Controller({ path: 'refunds', version: '1' })
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Get()
  @RequirePermission(PermissionArea.PAYMENTS, PermissionLevel.VIEW)
  @ApiOperation({ summary: 'List/search/filter refunds.' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListRefundsQueryDto) {
    return this.refundsService.list(user.tenantId, query);
  }

  @Get(':id')
  @RequirePermission(PermissionArea.PAYMENTS, PermissionLevel.VIEW)
  @ApiOperation({ summary: 'A single refund.' })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.refundsService.findByIdInTenant(user.tenantId, id);
  }
}
