import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelMembershipDto {
  @ApiPropertyOptional({ example: 'Member requested cancellation at front desk.' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
