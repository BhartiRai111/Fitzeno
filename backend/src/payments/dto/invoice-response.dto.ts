import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, TransactionStatus, TransactionType } from '../../generated/prisma/enums.js';
import type { Invoice } from '../../generated/prisma/client.js';

class InvoiceMemberSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
}

export class InvoiceLineItemDto {
  @ApiProperty() description!: string;
  @ApiProperty() quantity!: number;
  @ApiProperty() unitPrice!: number;
  @ApiProperty() amount!: number;
}

class InvoiceTransactionSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: TransactionType }) type!: TransactionType;
  @ApiProperty({ enum: TransactionStatus }) status!: TransactionStatus;
  @ApiProperty({ enum: PaymentMethod }) method!: PaymentMethod;
}

export class InvoiceResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty() invoiceNumber!: string;
  @ApiProperty({ type: InvoiceMemberSummaryDto }) member!: InvoiceMemberSummaryDto;
  @ApiProperty({ type: InvoiceTransactionSummaryDto, description: "The invoice's payment status IS its transaction's status — there is no separate stored invoice status." })
  transaction!: InvoiceTransactionSummaryDto;

  @ApiProperty({ type: [InvoiceLineItemDto] }) lineItems!: InvoiceLineItemDto[];
  @ApiProperty() subtotal!: number;
  @ApiProperty() discountAmount!: number;
  @ApiProperty() taxAmount!: number;
  @ApiProperty() totalAmount!: number;
  @ApiProperty() currency!: string;

  @ApiProperty() issueDate!: Date;
  @ApiPropertyOptional({ nullable: true }) dueDate!: Date | null;

  @ApiProperty() createdAt!: Date;
}

export type InvoiceWithRelations = Invoice & {
  member: { id: string; firstName: string; lastName: string };
  transaction: { id: string; type: TransactionType; status: TransactionStatus; method: PaymentMethod; currency: string };
};

export function toInvoiceResponse(invoice: InvoiceWithRelations): InvoiceResponseDto {
  return {
    id: invoice.id,
    tenantId: invoice.tenantId,
    invoiceNumber: invoice.invoiceNumber,
    member: invoice.member,
    transaction: {
      id: invoice.transaction.id,
      type: invoice.transaction.type,
      status: invoice.transaction.status,
      method: invoice.transaction.method,
    },
    lineItems: invoice.lineItems as unknown as InvoiceLineItemDto[],
    subtotal: Number(invoice.subtotal),
    discountAmount: Number(invoice.discountAmount),
    taxAmount: Number(invoice.taxAmount),
    totalAmount: Number(invoice.totalAmount),
    currency: invoice.transaction.currency,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    createdAt: invoice.createdAt,
  };
}
