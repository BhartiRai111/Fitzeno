import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class MarkFailedDto {
  @ApiPropertyOptional({ example: 'Card declined — insufficient funds.' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
