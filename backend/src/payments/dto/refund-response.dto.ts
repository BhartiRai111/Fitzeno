import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RefundStatus } from '../../generated/prisma/enums.js';
import type { Refund } from '../../generated/prisma/client.js';

class RefundTransactionSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() amount!: number;
  @ApiProperty() invoiceNumber!: string | null;
}

class RefundUserSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
}

export class RefundResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty({ type: RefundTransactionSummaryDto }) transaction!: RefundTransactionSummaryDto;
  @ApiProperty() amount!: number;
  @ApiPropertyOptional({ nullable: true }) reason!: string | null;
  @ApiProperty({ enum: RefundStatus }) status!: RefundStatus;
  @ApiPropertyOptional({ nullable: true, type: RefundUserSummaryDto }) processedByUser!: RefundUserSummaryDto | null;
  @ApiPropertyOptional({ nullable: true }) completedAt!: Date | null;
  @ApiProperty() createdAt!: Date;
}

export type RefundWithRelations = Refund & {
  transaction: { id: string; amount: unknown; invoice: { invoiceNumber: string } | null };
  processedByUser: { id: string; firstName: string; lastName: string } | null;
};

export function toRefundResponse(refund: RefundWithRelations): RefundResponseDto {
  return {
    id: refund.id,
    tenantId: refund.tenantId,
    transaction: {
      id: refund.transaction.id,
      amount: Number(refund.transaction.amount),
      invoiceNumber: refund.transaction.invoice?.invoiceNumber ?? null,
    },
    amount: Number(refund.amount),
    reason: refund.reason,
    status: refund.status,
    processedByUser: refund.processedByUser,
    completedAt: refund.completedAt,
    createdAt: refund.createdAt,
  };
}
