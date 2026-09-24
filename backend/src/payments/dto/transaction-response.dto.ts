import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, TransactionStatus, TransactionType } from '../../generated/prisma/enums.js';
import type { Transaction } from '../../generated/prisma/client.js';

class TransactionMemberSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
}

class TransactionUserSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
}

export class TransactionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty({ type: TransactionMemberSummaryDto }) member!: TransactionMemberSummaryDto;

  @ApiProperty({ enum: TransactionType }) type!: TransactionType;
  @ApiProperty() description!: string;
  @ApiProperty() amount!: number;
  @ApiProperty() currency!: string;
  @ApiProperty({ enum: PaymentMethod }) method!: PaymentMethod;
  @ApiProperty({ enum: TransactionStatus }) status!: TransactionStatus;
  @ApiPropertyOptional({ nullable: true }) failureReason!: string | null;

  @ApiPropertyOptional({ nullable: true }) relatedMembershipId!: string | null;
  @ApiPropertyOptional({ nullable: true }) relatedPtSessionId!: string | null;
  @ApiPropertyOptional({ nullable: true }) relatedClassBookingId!: string | null;

  @ApiPropertyOptional({ nullable: true, type: TransactionUserSummaryDto }) recordedByUser!: TransactionUserSummaryDto | null;

  @ApiPropertyOptional({ nullable: true }) invoiceNumber!: string | null;
  @ApiProperty() refundedAmount!: number;

  @ApiPropertyOptional({ nullable: true }) paidAt!: Date | null;
  @ApiPropertyOptional({ nullable: true }) cancelledAt!: Date | null;

  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export type TransactionWithRelations = Transaction & {
  member: { id: string; firstName: string; lastName: string };
  recordedByUser: { id: string; firstName: string; lastName: string } | null;
  invoice: { invoiceNumber: string } | null;
  refunds: { amount: unknown; status: string }[];
};

export function toTransactionResponse(transaction: TransactionWithRelations): TransactionResponseDto {
  const refundedAmount = transaction.refunds
    .filter((r) => r.status === 'COMPLETED')
    .reduce((sum, r) => sum + Number(r.amount), 0);

  return {
    id: transaction.id,
    tenantId: transaction.tenantId,
    member: transaction.member,
    type: transaction.type,
    description: transaction.description,
    amount: Number(transaction.amount),
    currency: transaction.currency,
    method: transaction.method,
    status: transaction.status,
    failureReason: transaction.failureReason,
    relatedMembershipId: transaction.relatedMembershipId,
    relatedPtSessionId: transaction.relatedPtSessionId,
    relatedClassBookingId: transaction.relatedClassBookingId,
    recordedByUser: transaction.recordedByUser,
    invoiceNumber: transaction.invoice?.invoiceNumber ?? null,
    refundedAmount,
    paidAt: transaction.paidAt,
    cancelledAt: transaction.cancelledAt,
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
  };
}
