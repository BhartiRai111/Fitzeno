import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateMembershipDto {
  @ApiProperty()
  @IsUUID()
  memberId!: string;

  @ApiProperty({ description: 'Must reference an ACTIVE plan in this gym.' })
  @IsUUID()
  planId!: string;

  @ApiPropertyOptional({ description: 'Defaults to today. May be in the future to schedule a membership that starts later.' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

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
