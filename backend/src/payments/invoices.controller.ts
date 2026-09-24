import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/types/jwt-payload.interface.js';
import { PermissionArea, PermissionLevel } from '../generated/prisma/enums.js';
import { RequirePermission } from '../authz/require-permission.decorator.js';
import { InvoicesService } from './invoices.service.js';
import { ListInvoicesQueryDto } from './dto/list-invoices-query.dto.js';

/**
 * Read-only — invoices are always generated automatically alongside a
 * Transaction (see TransactionsService.record / InvoicesService), never
 * created or edited through this controller.
 */
@ApiTags('invoices')
@ApiBearerAuth()
@Controller({ path: 'invoices', version: '1' })
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @RequirePermission(PermissionArea.PAYMENTS, PermissionLevel.VIEW)
  @ApiOperation({ summary: 'List/search/filter invoices.' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListInvoicesQueryDto) {
    return this.invoicesService.list(user.tenantId, query);
  }

  @Get('me')
  @ApiOperation({ summary: "The caller's own invoice history." })
  listOwn(@CurrentUser() user: AuthenticatedUser, @Query() query: ListInvoicesQueryDto) {
    return this.invoicesService.listOwn(user.tenantId, user.id, query);
  }

  @Get('me/:id')
  @ApiOperation({ summary: "A single invoice of the caller's own." })
  findOwnOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.invoicesService.findOwnByIdInTenant(user.tenantId, user.id, id);
  }

  @Get(':id')
  @RequirePermission(PermissionArea.PAYMENTS, PermissionLevel.VIEW)
  @ApiOperation({ summary: 'A single invoice.' })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.invoicesService.findByIdInTenant(user.tenantId, id);
  }
}
