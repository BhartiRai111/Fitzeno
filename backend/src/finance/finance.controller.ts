import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/types/jwt-payload.interface.js';
import { PermissionArea, PermissionLevel } from '../generated/prisma/enums.js';
import { RequirePermission } from '../authz/require-permission.decorator.js';
import { FinanceService } from './finance.service.js';
import { FinanceOverviewQueryDto } from './dto/finance-overview-query.dto.js';

/** Read-only: the Financial Overview surfaces figures, it never mutates them directly — a revenue figure only ever changes via Payments/Refunds, an expense total only via the Expenses endpoints. Gated on `FINANCE:VIEW` — same sensitive-data boundary as ExpensesController's read routes. */
@ApiTags('finance')
@ApiBearerAuth()
@Controller({ path: 'finance', version: '1' })
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('overview')
  @RequirePermission(PermissionArea.FINANCE, PermissionLevel.VIEW)
  @ApiOperation({
    summary: 'Revenue, expenses, and net result for a period — the Financial Overview dashboard\'s one endpoint.',
    description: 'preset defaults to "month". A custom period requires both `from` and `to`.',
  })
  getOverview(@CurrentUser() user: AuthenticatedUser, @Query() query: FinanceOverviewQueryDto) {
    return this.financeService.getOverview(user.tenantId, query);
  }

  @Get('trend')
  @RequirePermission(PermissionArea.FINANCE, PermissionLevel.VIEW)
  @ApiOperation({ summary: 'Month-bucketed revenue/expenses/net for the trailing N months (default 6, max 12) — powers the revenue-vs-expenses trend chart.' })
  getTrend(@CurrentUser() user: AuthenticatedUser, @Query('months') months?: string) {
    return this.financeService.getTrend(user.tenantId, months ? Number(months) : undefined);
  }
}
