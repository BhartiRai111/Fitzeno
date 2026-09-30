import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { CheckInMethod } from '../../generated/prisma/enums.js';

export class ListAttendanceQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  memberId?: string;

  @ApiPropertyOptional({ enum: CheckInMethod })
  @IsOptional()
  @IsEnum(CheckInMethod)
  method?: CheckInMethod;

  @ApiPropertyOptional({ description: 'true = still checked in (no check-out yet), false = checked out.' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  open?: boolean;

  @ApiPropertyOptional({ description: 'Inclusive, YYYY-MM-DD.' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Inclusive, YYYY-MM-DD.' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
