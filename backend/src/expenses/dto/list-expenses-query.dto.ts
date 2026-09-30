import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { ExpenseCategory, ExpenseFrequency, ExpenseStatus } from '../../generated/prisma/enums.js';

export class ListExpensesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ExpenseCategory })
  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;

  @ApiPropertyOptional({ enum: ExpenseStatus })
  @IsOptional()
  @IsEnum(ExpenseStatus)
  status?: ExpenseStatus;

  @ApiPropertyOptional({ enum: ExpenseFrequency })
  @IsOptional()
  @IsEnum(ExpenseFrequency)
  frequency?: ExpenseFrequency;

  @ApiPropertyOptional({ description: 'true = recurring (frequency !== ONE_TIME), false = one-time.' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  recurring?: boolean;

  @ApiPropertyOptional({ description: 'Inclusive, filters on `date`.' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Inclusive, filters on `date`.' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
