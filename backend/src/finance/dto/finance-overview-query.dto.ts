import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional } from 'class-validator';

/** Mirrors the approved frontend's own `PeriodPreset` exactly — see reports-helpers.ts. */
export const FINANCE_PERIOD_PRESETS = ['today', 'week', 'month', 'last-month', 'custom'] as const;
export type FinancePeriodPreset = (typeof FINANCE_PERIOD_PRESETS)[number];

export class FinanceOverviewQueryDto {
  @ApiPropertyOptional({ enum: FINANCE_PERIOD_PRESETS, default: 'month' })
  @IsOptional()
  @IsIn(FINANCE_PERIOD_PRESETS)
  preset?: FinancePeriodPreset;

  @ApiPropertyOptional({ description: 'Required when preset=custom, YYYY-MM-DD.' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Required when preset=custom, YYYY-MM-DD.' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
