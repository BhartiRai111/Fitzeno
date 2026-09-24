import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaymentMethod } from '../../generated/prisma/enums.js';

/** The member-portal self-service action — always "purchase or renew, whichever applies" (see MembershipsService.purchaseOrRenewForSelf). */
export class PurchaseMembershipDto {
  @ApiProperty({ description: 'Must reference an ACTIVE plan in this gym.' })
  @IsUUID()
  planId!: string;

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
