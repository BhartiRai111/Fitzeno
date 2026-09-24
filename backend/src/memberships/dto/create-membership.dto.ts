import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaymentMethod } from '../../generated/prisma/enums.js';

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

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentReference?: string;
}
