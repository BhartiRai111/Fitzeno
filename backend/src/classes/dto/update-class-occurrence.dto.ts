import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Overrides one dated occurrence without touching its ClassSeries template — a substitute trainer, a room change, a delayed start. */
export class UpdateClassOccurrenceDto {
  @ApiPropertyOptional({ description: 'Must reference a TRAINER in this gym. Re-checked for schedule conflicts.' })
  @IsOptional()
  @IsUUID()
  trainerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'startTime must be in HH:mm 24-hour format' })
  startTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'endTime must be in HH:mm 24-hour format' })
  endTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  location?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 200, description: 'Cannot be set below the current confirmed-booking count.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  capacity?: number;
}
