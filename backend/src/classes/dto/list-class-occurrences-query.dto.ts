import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ClassOccurrenceStatus } from '../../generated/prisma/enums.js';

export class ListClassOccurrencesQueryDto {
  @ApiPropertyOptional({ description: 'Inclusive. Defaults to today.' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Inclusive. Defaults to 8 weeks from "from".' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  trainerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ enum: ClassOccurrenceStatus })
  @IsOptional()
  @IsEnum(ClassOccurrenceStatus)
  status?: ClassOccurrenceStatus;
}
