import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelClassDto {
  @ApiPropertyOptional({ example: 'Trainer unavailable — rescheduling next week.' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
