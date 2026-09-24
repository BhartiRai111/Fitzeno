import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { LeadSource, LeadStatus } from '../../generated/prisma/enums.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

export class ListLeadsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: LeadStatus })
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @ApiPropertyOptional({ enum: LeadSource })
  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional({
    description:
      'Leads with a follow-up due on or before this date (and still open — not CONVERTED/LOST). Answers "which leads need attention today?" with today\'s date.',
  })
  @IsOptional()
  @IsDateString()
  followUpDueBy?: string;
}
