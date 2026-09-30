import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class AttendanceStatsQueryDto {
  @ApiProperty({ description: 'Inclusive, YYYY-MM-DD.' })
  @IsDateString()
  from!: string;

  @ApiProperty({ description: 'Inclusive, YYYY-MM-DD.' })
  @IsDateString()
  to!: string;
}
