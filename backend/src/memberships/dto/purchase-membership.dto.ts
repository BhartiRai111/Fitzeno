import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/** The member-portal self-service action — always "purchase or renew, whichever applies" (see MembershipsService.purchaseOrRenewForSelf). */
export class PurchaseMembershipDto {
  @ApiProperty({ description: 'Must reference an ACTIVE plan in this gym.' })
  @IsUUID()
  planId!: string;

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
