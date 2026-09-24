import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsUUID } from 'class-validator';

export class AvailableSlotsQueryDto {
  @ApiProperty()
  @IsUUID()
  trainerId!: string;

  @ApiProperty({ description: 'The calendar date to compute free windows for.' })
  @IsDateString()
  date!: string;
}
