import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import { PaymentMethod, TransactionType } from '../../generated/prisma/enums.js';

/**
 * The manual "Record a payment" action — a staff member logging a payment
 * that already happened (cash at the counter, a bank transfer confirmed
 * separately, etc.), mirroring the approved frontend's RecordPaymentDialog
 * exactly. Always recorded as already `PAID` — there's no "record a
 * pending payment" concept in the approved UI for this action; a
 * genuinely pending payment comes from the Membership purchase flow
 * instead (`TransactionsService.record`'s lower-level, internal-only
 * entry point), which this DTO/endpoint never touches directly.
 */
export class CreateTransactionDto {
  @ApiProperty()
  @IsUUID()
  memberId!: string;

  @ApiProperty({ enum: TransactionType })
  @IsEnum(TransactionType)
  type!: TransactionType;

  @ApiProperty({ example: 'Growth plan — cash payment at front desk' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  description!: string;

  @ApiProperty({ example: 69, minimum: 0.01 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1000000)
  amount!: number;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @ApiPropertyOptional({ description: 'Optionally link this payment to an existing membership period.' })
  @IsOptional()
  @IsUUID()
  relatedMembershipId?: string;

  @ApiPropertyOptional({ description: 'A client-supplied key to make a retried request safe — replaying the same key returns the original transaction instead of creating a duplicate.' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  idempotencyKey?: string;
}
