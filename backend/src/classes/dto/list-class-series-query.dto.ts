import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { ClassSeriesStatus, DayOfWeek } from '../../generated/prisma/enums.js';

export class ListClassSeriesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  trainerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ enum: DayOfWeek })
  @IsOptional()
  @IsEnum(DayOfWeek)
  dayOfWeek?: DayOfWeek;

  @ApiPropertyOptional({ enum: ClassSeriesStatus })
  @IsOptional()
  @IsEnum(ClassSeriesStatus)
  status?: ClassSeriesStatus;
}
