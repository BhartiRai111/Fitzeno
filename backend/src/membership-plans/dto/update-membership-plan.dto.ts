import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { BillingPeriod } from '../../generated/prisma/enums.js';

export class UpdateMembershipPlanDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100000)
  price?: number;

  @ApiPropertyOptional({ enum: BillingPeriod })
  @IsOptional()
  @IsEnum(BillingPeriod)
  billingPeriod?: BillingPeriod;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  perks?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPopular?: boolean;
}
