import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

/** PENDING/EXPIRING/EXPIRED are computed filters (see MembershipsService.effectiveStatusWhere) — never stored columns. */
export enum EffectiveMembershipStatusFilter {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  EXPIRING = 'EXPIRING',
  EXPIRED = 'EXPIRED',
  FROZEN = 'FROZEN',
  CANCELLED = 'CANCELLED',
}

export class ListMembershipsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  memberId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  planId?: string;

  @ApiPropertyOptional({ enum: EffectiveMembershipStatusFilter })
  @IsOptional()
  @IsEnum(EffectiveMembershipStatusFilter)
  effectiveStatus?: EffectiveMembershipStatusFilter;

  @ApiPropertyOptional({ description: 'Only memberships whose endDate falls on/after this date.' })
  @IsOptional()
  @IsDateString()
  endDateFrom?: string;

  @ApiPropertyOptional({ description: 'Only memberships whose endDate falls on/before this date.' })
  @IsOptional()
  @IsDateString()
  endDateTo?: string;
}
