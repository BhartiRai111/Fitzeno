import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { DayOfWeek } from '../../generated/prisma/enums.js';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class UpdateClassSeriesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: 'Must reference a TRAINER in this gym. Re-checked for schedule conflicts.' })
  @IsOptional()
  @IsUUID()
  trainerId?: string;

  @ApiPropertyOptional({ enum: DayOfWeek })
  @IsOptional()
  @IsEnum(DayOfWeek)
  dayOfWeek?: DayOfWeek;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'startTime must be in HH:mm 24-hour format' })
  startTime?: string;

  @ApiPropertyOptional({ minimum: 5, maximum: 300 })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(300)
  durationMinutes?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 200, description: 'Cannot be set below the highest single occurrence\'s current confirmed-booking count.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  capacity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  location?: string;

  @ApiPropertyOptional({ description: 'Inclusive end date for the recurrence, or omit to leave open-ended.' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
