import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, Matches } from 'class-validator';
import { DayOfWeek } from '../../generated/prisma/enums.js';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateAvailabilitySlotDto {
  @ApiProperty({ enum: DayOfWeek })
  @IsEnum(DayOfWeek)
  dayOfWeek!: DayOfWeek;

  @ApiProperty({ example: '09:00', description: '24-hour "HH:mm".' })
  @Matches(TIME_PATTERN, { message: 'startTime must be in HH:mm 24-hour format' })
  startTime!: string;

  @ApiProperty({ example: '11:00', description: '24-hour "HH:mm", must be after startTime.' })
  @Matches(TIME_PATTERN, { message: 'endTime must be in HH:mm 24-hour format' })
  endTime!: string;
}
