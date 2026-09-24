import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MembersService } from '../members/members.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PaginatedResult } from '../common/dto/pagination-query.dto.js';
import { toInvoiceResponse, type InvoiceResponseDto } from './dto/invoice-response.dto.js';
import type { ListInvoicesQueryDto } from './dto/list-invoices-query.dto.js';

export interface InvoiceLineItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

const invoiceInclude = {
  member: { select: { id: true, firstName: true, lastName: true } },
  transaction: { select: { id: true, type: true, status: true, method: true, currency: true } },
};

function toUtcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function parseDateOnly(value: string): Date {
  return toUtcMidnight(new Date(value));
}

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membersService: MembersService,
  ) {}

  /**
   * Atomically claims the next sequential invoice number for this tenant —
   * a single row-locked UPDATE (see InvoiceCounter's own schema comment),
   * safe to call from inside any transaction without a separate
   * check-then-write race.
   */
  private async nextInvoiceNumber(tx: Prisma.TransactionClient, tenantId: string): Promise<string> {
    const counter = await tx.invoiceCounter.upsert({
      where: { tenantId },
      create: { tenantId, lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
    });
    return `INV-${String(counter.lastNumber).padStart(6, '0')}`;
  }

  /**
   * Generates the one Invoice for a just-created Transaction — always
   * called from inside TransactionsService.record's own transaction, never
   * exposed as a standalone create endpoint (see the module's own README
   * notes on why invoices are never manually authored in this product).
   * A single line item mirrors the transaction 1:1 today; `subtotal` is
   * therefore always the transaction amount, with no discount/tax applied
   * — both fields exist and are reconciled into `totalAmount` for when a
   * future phase actually applies them.
   */
  async createForTransaction(
    tx: Prisma.TransactionClient,
    tenantId: string,
    transaction: { id: string; memberId: string; description: string; amount: Prisma.Decimal | number },
  ) {
    const invoiceNumber = await this.nextInvoiceNumber(tx, tenantId);
    const amount = Number(transaction.amount);
    const lineItems: InvoiceLineItemInput[] = [{ description: transaction.description, quantity: 1, unitPrice: amount, amount }];

    return tx.invoice.create({
      data: {
        tenantId,
        memberId: transaction.memberId,
        transactionId: transaction.id,
        invoiceNumber,
        lineItems: lineItems as unknown as Prisma.InputJsonValue,
        subtotal: amount,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: amount,
      },
    });
  }

  async findByIdInTenant(tenantId: string, id: string): Promise<InvoiceResponseDto> {
    const invoice = await this.prisma.invoice.findFirst({ where: { id, tenantId }, include: invoiceInclude });
    if (!invoice) {
      throw new NotFoundException('Invoice not found.');
    }
    return toInvoiceResponse(invoice);
  }

  async findOwnByIdInTenant(tenantId: string, userId: string, id: string): Promise<InvoiceResponseDto> {
    const memberId = await this.membersService.getOwnMemberId(tenantId, userId);
    const invoice = await this.prisma.invoice.findFirst({ where: { id, tenantId }, include: invoiceInclude });
    if (!invoice) {
      throw new NotFoundException('Invoice not found.');
    }
    if (invoice.memberId !== memberId) {
      throw new ForbiddenException("You don't have access to this invoice.");
    }
    return toInvoiceResponse(invoice);
  }

  async listOwn(tenantId: string, userId: string, query: ListInvoicesQueryDto): Promise<PaginatedResult<InvoiceResponseDto>> {
    const memberId = await this.membersService.getOwnMemberId(tenantId, userId);
    return this.list(tenantId, { ...query, memberId, skip: query.skip });
  }

  async list(tenantId: string, query: ListInvoicesQueryDto): Promise<PaginatedResult<InvoiceResponseDto>> {
    const where = {
      tenantId,
      ...(query.memberId ? { memberId: query.memberId } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            issueDate: {
              ...(query.dateFrom ? { gte: parseDateOnly(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: parseDateOnly(query.dateTo) } : {}),
            },
          }
        : {}),
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { issueDate: query.sortOrder },
        include: invoiceInclude,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return new PaginatedResult(items.map(toInvoiceResponse), totalItems, query.page, query.limit);
  }
}
