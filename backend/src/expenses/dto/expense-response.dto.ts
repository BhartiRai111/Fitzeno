import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseCategory, ExpenseFrequency, ExpenseStatus, PaymentMethod } from '../../generated/prisma/enums.js';
import type { Expense } from '../../generated/prisma/client.js';

class ExpenseRecordedBySummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
}

export class ExpenseResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty() reference!: string;

  @ApiProperty() title!: string;
  @ApiProperty({ enum: ExpenseCategory }) category!: ExpenseCategory;
  @ApiProperty() amount!: number;
  @ApiProperty() currency!: string;

  @ApiProperty({ enum: ExpenseFrequency }) frequency!: ExpenseFrequency;
  @ApiProperty({ description: 'Derived: frequency !== ONE_TIME — see the schema\'s own comment on why this is never a stored column.' })
  recurring!: boolean;
  @ApiProperty({ enum: ExpenseStatus }) status!: ExpenseStatus;
  @ApiProperty({ enum: PaymentMethod }) method!: PaymentMethod;

  @ApiPropertyOptional({ nullable: true }) vendor!: string | null;
  @ApiPropertyOptional({ nullable: true }) notes!: string | null;

  @ApiProperty() date!: Date;
  @ApiPropertyOptional({ nullable: true }) dueDate!: Date | null;

  @ApiPropertyOptional({ nullable: true }) paidAt!: Date | null;
  @ApiPropertyOptional({ nullable: true }) cancelledAt!: Date | null;

  @ApiPropertyOptional({ nullable: true, type: ExpenseRecordedBySummaryDto }) recordedByUser!: ExpenseRecordedBySummaryDto | null;

  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export type ExpenseWithRelations = Expense & {
  recordedByUser: { id: string; firstName: string; lastName: string } | null;
};

export function toExpenseResponse(expense: ExpenseWithRelations): ExpenseResponseDto {
  return {
    id: expense.id,
    tenantId: expense.tenantId,
    reference: expense.reference,
    title: expense.title,
    category: expense.category,
    amount: Number(expense.amount),
    currency: expense.currency,
    frequency: expense.frequency,
    recurring: expense.frequency !== ExpenseFrequency.ONE_TIME,
    status: expense.status,
    method: expense.method,
    vendor: expense.vendor,
    notes: expense.notes,
    date: expense.date,
    dueDate: expense.dueDate,
    paidAt: expense.paidAt,
    cancelledAt: expense.cancelledAt,
    recordedByUser: expense.recordedByUser,
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
  };
}
