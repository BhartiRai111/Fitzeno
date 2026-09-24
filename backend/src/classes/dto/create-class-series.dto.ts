import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { DayOfWeek } from '../../generated/prisma/enums.js';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateClassSeriesDto {
  @ApiProperty({ example: 'Sunrise Spin' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'Spin', description: 'Free text — e.g. "HIIT", "Yoga", "Strength".' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  category!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ description: 'Must reference a TRAINER in this gym.' })
  @IsUUID()
  trainerId!: string;

  @ApiProperty({ enum: DayOfWeek })
  @IsEnum(DayOfWeek)
  dayOfWeek!: DayOfWeek;

  @ApiProperty({ example: '06:00' })
  @Matches(TIME_PATTERN, { message: 'startTime must be in HH:mm 24-hour format' })
  startTime!: string;

  @ApiProperty({ example: 45, minimum: 5, maximum: 300 })
  @IsInt()
  @Min(5)
  @Max(300)
  durationMinutes!: number;

  @ApiProperty({ minimum: 1, maximum: 200 })
  @IsInt()
  @Min(1)
  @Max(200)
  capacity!: number;

  @ApiProperty({ example: 'Conditioning Studio' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  location!: string;

  @ApiProperty({ description: 'The date this recurrence begins. Defaults to today.' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Inclusive end date. Set equal to startDate for a one-off class.' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
