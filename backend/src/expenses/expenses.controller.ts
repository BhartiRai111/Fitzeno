import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/types/jwt-payload.interface.js';
import { PermissionArea, PermissionLevel } from '../generated/prisma/enums.js';
import { RequirePermission } from '../authz/require-permission.decorator.js';
import { ExpensesService } from './expenses.service.js';
import { CreateExpenseDto } from './dto/create-expense.dto.js';
import { UpdateExpenseDto } from './dto/update-expense.dto.js';
import { ListExpensesQueryDto } from './dto/list-expenses-query.dto.js';

/**
 * Gated entirely on the existing `FINANCE` PermissionArea — its role
 * defaults already match this data's intended sensitivity exactly
 * (OWNER/MANAGER: MANAGE, FRONT_DESK/TRAINER: NONE — see
 * role-permissions.const.ts), unlike ATTENDANCE in the previous phase,
 * so no additional @Roles() stacking is needed here.
 */
@ApiTags('expenses')
@ApiBearerAuth()
@Controller({ path: 'expenses', version: '1' })
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get()
  @RequirePermission(PermissionArea.FINANCE, PermissionLevel.VIEW)
  @ApiOperation({ summary: 'List/search/filter expenses.' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListExpensesQueryDto) {
    return this.expensesService.list(user.tenantId, query);
  }

  @Post()
  @RequirePermission(PermissionArea.FINANCE, PermissionLevel.MANAGE)
  @ApiOperation({ summary: 'Record a new expense.' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateExpenseDto) {
    return this.expensesService.create(user.tenantId, user.id, dto);
  }

  @Get(':id')
  @RequirePermission(PermissionArea.FINANCE, PermissionLevel.VIEW)
  @ApiOperation({ summary: 'A single expense.' })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.expensesService.findByIdInTenant(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermission(PermissionArea.FINANCE, PermissionLevel.MANAGE)
  @ApiOperation({ summary: 'Edit any field on an expense, including its status directly.' })
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateExpenseDto) {
    return this.expensesService.update(user.tenantId, id, dto);
  }

  @Post(':id/mark-paid')
  @RequirePermission(PermissionArea.FINANCE, PermissionLevel.MANAGE)
  @ApiOperation({ summary: 'Confirm a pending expense as paid.' })
  markPaid(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.expensesService.markPaid(user.tenantId, id);
  }

  @Post(':id/cancel')
  @RequirePermission(PermissionArea.FINANCE, PermissionLevel.MANAGE)
  @ApiOperation({ summary: 'Void a still-pending expense — it never counts toward any total.' })
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.expensesService.cancel(user.tenantId, id);
  }

  @Post(':id/reopen')
  @RequirePermission(PermissionArea.FINANCE, PermissionLevel.MANAGE)
  @ApiOperation({ summary: 'Restore a cancelled expense back to pending.' })
  reopen(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.expensesService.reopen(user.tenantId, id);
  }
}
