import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class ReschedulePtSessionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'startTime must be in HH:mm 24-hour format' })
  startTime?: string;

  @ApiPropertyOptional({ minimum: 15, maximum: 240 })
  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(240)
  durationMinutes?: number;
}
