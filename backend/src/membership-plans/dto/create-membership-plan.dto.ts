import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { BillingPeriod } from '../../generated/prisma/enums.js';

export class CreateMembershipPlanDto {
  @ApiProperty({ example: 'Growth' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: 'Our most popular plan — full access plus unlimited classes.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 69, minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100000)
  price!: number;

  @ApiProperty({ enum: BillingPeriod })
  @IsEnum(BillingPeriod)
  billingPeriod!: BillingPeriod;

  @ApiPropertyOptional({ type: [String], example: ['Unlimited group classes', 'Priority class booking'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  perks?: string[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPopular?: boolean;
}
