import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/types/jwt-payload.interface.js';
import { PermissionArea, PermissionLevel } from '../generated/prisma/enums.js';
import { RequirePermission } from '../authz/require-permission.decorator.js';
import { TransactionsService } from './transactions.service.js';
import { CreateTransactionDto } from './dto/create-transaction.dto.js';
import { MarkFailedDto } from './dto/mark-failed.dto.js';
import { RefundTransactionDto } from './dto/refund-transaction.dto.js';
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto.js';

/**
 * Staff routes are gated on the existing `PAYMENTS` PermissionArea
 * unchanged (OWNER/MANAGER/FRONT_DESK manage by default, TRAINER none —
 * "trainers should not automatically access sensitive financial
 * administration"). Every "me" route needs no permission at all — always
 * the caller's own data, the same precedent as every other self-service
 * route in this backend.
 */
@ApiTags('transactions')
@ApiBearerAuth()
@Controller({ path: 'transactions', version: '1' })
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  @RequirePermission(PermissionArea.PAYMENTS, PermissionLevel.VIEW)
  @ApiOperation({ summary: 'List/search/filter transactions.' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListTransactionsQueryDto) {
    return this.transactionsService.list(user.tenantId, query);
  }

  @Post()
  @RequirePermission(PermissionArea.PAYMENTS, PermissionLevel.MANAGE)
  @ApiOperation({ summary: 'Record a payment already received (cash, a confirmed bank transfer, etc.) — always immediately PAID.' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTransactionDto) {
    return this.transactionsService.recordManual(user.tenantId, user.id, dto);
  }

  @Get('stats')
  @RequirePermission(PermissionArea.PAYMENTS, PermissionLevel.VIEW)
  @ApiOperation({ summary: 'Revenue/pending/failed/refunded summary, optionally over a date range — a data source for Reports, not a Reports module.' })
  stats(@CurrentUser() user: AuthenticatedUser, @Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return this.transactionsService.getStats(user.tenantId, { from: dateFrom, to: dateTo });
  }

  @Get('me')
  @ApiOperation({ summary: "The caller's own payment history." })
  listOwn(@CurrentUser() user: AuthenticatedUser, @Query() query: ListTransactionsQueryDto) {
    return this.transactionsService.listOwn(user.tenantId, user.id, query);
  }

  @Get('me/:id')
  @ApiOperation({ summary: "A single transaction of the caller's own." })
  findOwnOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.transactionsService.findOwnByIdInTenant(user.tenantId, user.id, id);
  }

  @Get(':id')
  @RequirePermission(PermissionArea.PAYMENTS, PermissionLevel.VIEW)
  @ApiOperation({ summary: 'A single transaction.' })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.transactionsService.findByIdInTenant(user.tenantId, id);
  }

  @Post(':id/mark-paid')
  @RequirePermission(PermissionArea.PAYMENTS, PermissionLevel.MANAGE)
  @ApiOperation({ summary: 'Confirm a pending payment (e.g. a bank transfer) as received.' })
  markPaid(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.transactionsService.markPaid(user.tenantId, id);
  }

  @Post(':id/mark-failed')
  @RequirePermission(PermissionArea.PAYMENTS, PermissionLevel.MANAGE)
  @ApiOperation({ summary: 'Mark a pending payment as failed/declined.' })
  markFailed(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: MarkFailedDto) {
    return this.transactionsService.markFailed(user.tenantId, id, dto.reason);
  }

  @Post(':id/cancel')
  @RequirePermission(PermissionArea.PAYMENTS, PermissionLevel.MANAGE)
  @ApiOperation({ summary: 'Cancel a still-pending payment.' })
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.transactionsService.cancel(user.tenantId, id);
  }

  @Post(':id/refund')
  @RequirePermission(PermissionArea.PAYMENTS, PermissionLevel.MANAGE)
  @ApiOperation({
    summary: 'Refund a paid transaction, in full or in part.',
    description: 'Omit amount for a full refund of whatever remains refundable. Rejects an amount exceeding what remains.',
  })
  refund(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: RefundTransactionDto) {
    return this.transactionsService.refund(user.tenantId, id, {
      amount: dto.amount,
      reason: dto.reason,
      processedByUserId: user.id,
    });
  }
}
