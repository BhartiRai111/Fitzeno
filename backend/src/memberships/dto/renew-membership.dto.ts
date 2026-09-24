import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class RenewMembershipDto {
  @ApiPropertyOptional({ description: 'Renew onto a different ACTIVE plan (a "switch"). Omit to renew onto the same plan.' })
  @IsOptional()
  @IsUUID()
  planId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  paymentMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentReference?: string;
}
