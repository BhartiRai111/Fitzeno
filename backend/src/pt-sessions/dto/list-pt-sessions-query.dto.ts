import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { PtSessionStatus } from '../../generated/prisma/enums.js';

export class ListPtSessionsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  trainerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  memberId?: string;

  @ApiPropertyOptional({ enum: PtSessionStatus })
  @IsOptional()
  @IsEnum(PtSessionStatus)
  status?: PtSessionStatus;

  @ApiPropertyOptional({ description: 'Inclusive.' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Inclusive.' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
