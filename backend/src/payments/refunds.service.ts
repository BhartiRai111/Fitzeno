import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { PaginatedResult } from '../common/dto/pagination-query.dto.js';
import { toRefundResponse, type RefundResponseDto } from './dto/refund-response.dto.js';
import type { ListRefundsQueryDto } from './dto/list-refunds-query.dto.js';

const refundInclude = {
  transaction: { select: { id: true, amount: true, invoice: { select: { invoiceNumber: true } } } },
  processedByUser: { select: { id: true, firstName: true, lastName: true } },
};

/** Read-only — refunds are only ever created via TransactionsService.refund(), which owns the transaction-status transition alongside the write. */
@Injectable()
export class RefundsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByIdInTenant(tenantId: string, id: string): Promise<RefundResponseDto> {
    const refund = await this.prisma.refund.findFirst({ where: { id, tenantId }, include: refundInclude });
    if (!refund) {
      throw new NotFoundException('Refund not found.');
    }
    return toRefundResponse(refund);
  }

  async list(tenantId: string, query: ListRefundsQueryDto): Promise<PaginatedResult<RefundResponseDto>> {
    const where = {
      tenantId,
      ...(query.transactionId ? { transactionId: query.transactionId } : {}),
      ...(query.memberId ? { transaction: { memberId: query.memberId } } : {}),
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.refund.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: query.sortOrder },
        include: refundInclude,
      }),
      this.prisma.refund.count({ where }),
    ]);

    return new PaginatedResult(items.map(toRefundResponse), totalItems, query.page, query.limit);
  }
}
