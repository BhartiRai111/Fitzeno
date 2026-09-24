import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service.js';
import { MembersService } from '../members/members.service.js';
import { InvoicesService } from './invoices.service.js';
import { runSerializableTransaction } from '../common/utils/serializable-transaction.util.js';
import { PaymentMethod, RefundStatus, TransactionStatus, TransactionType } from '../generated/prisma/enums.js';
import { Prisma } from '../generated/prisma/client.js';
import { PaginatedResult } from '../common/dto/pagination-query.dto.js';
import {
  toTransactionResponse,
  type TransactionResponseDto,
  type TransactionWithRelations,
} from './dto/transaction-response.dto.js';
import { toRefundResponse, type RefundResponseDto } from './dto/refund-response.dto.js';
import type { CreateTransactionDto } from './dto/create-transaction.dto.js';
import type { ListTransactionsQueryDto } from './dto/list-transactions-query.dto.js';
import { NOTIFICATION_EVENTS } from '../notifications/events/domain-events.js';

/**
 * Reusable financial-transaction domain: this is the ONE place any
 * business module records a charge, rather than each module (Memberships
 * today; Classes/PT/Store later) owning its own payment logic. See the
 * schema's own phase-level comment for why a Transaction is both "the
 * charge" and "the payment attempt/result" in one row for this product —
 * every charge here is requested and settled (or declined) in the same
 * instant, with no approved-frontend flow that separates "create a
 * pending charge" from "attempt payment against it" as two distinct user
 * actions days apart the way a real subscription-billing system might.
 * `record()` is deliberately the one entry point every caller (this
 * module's own controller, and MembershipsService) goes through, so
 * idempotency, invoice generation, and currency snapshotting only exist
 * in one place.
 */
export interface RecordTransactionInput {
  memberId: string;
  type: TransactionType;
  description: string;
  amount: number;
  method: PaymentMethod;
  /** Only PENDING or PAID are valid initial states — see recordWithinTransaction's own runtime check. */
  status: TransactionStatus;
  relatedMembershipId?: string;
  relatedPtSessionId?: string;
  relatedClassBookingId?: string;
  recordedByUserId?: string;
  idempotencyKey?: string;
}

const transactionInclude = {
  member: { select: { id: true, firstName: true, lastName: true } },
  recordedByUser: { select: { id: true, firstName: true, lastName: true } },
  invoice: { select: { invoiceNumber: true } },
  refunds: { select: { amount: true, status: true } },
};

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membersService: MembersService,
    private readonly invoicesService: InvoicesService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * The one place a Transaction (and its 1:1 Invoice) is ever created.
   * Idempotent when `idempotencyKey` is supplied: replaying the same key
   * for this tenant returns the original transaction instead of creating
   * a duplicate — the scenario is a client retrying a request it isn't
   * sure succeeded, not a legitimate second charge. Opens its own
   * Serializable transaction — use `recordWithinTransaction` instead when
   * a caller (e.g. MembershipsService) needs this recorded atomically
   * alongside its own writes, inside a transaction it already holds.
   *
   * Emits TRANSACTION_PAID after the transaction commits (never from
   * inside recordWithinTransaction itself — see domain-events.ts's own
   * comment on why events only fire post-commit, and TransactionsService's
   * own recordWithinTransaction doc comment on why nested callers like
   * MembershipsService must never call `record` and emit their own event
   * instead). A rare idempotent replay re-emits this event for the same
   * already-committed payment — a harmless, low-stakes duplicate
   * notification, not a duplicate financial record (see the README's
   * known limitations).
   */
  async record(tenantId: string, input: RecordTransactionInput): Promise<TransactionResponseDto> {
    const result = await runSerializableTransaction(this.prisma, (tx) => this.recordWithinTransaction(tx, tenantId, input));
    if (result.status === TransactionStatus.PAID) {
      this.eventEmitter.emit(NOTIFICATION_EVENTS.TRANSACTION_PAID, {
        tenantId,
        memberId: result.member.id,
        transactionId: result.id,
        amount: result.amount,
        currency: result.currency,
        description: result.description,
      });
    }
    return result;
  }

  /**
   * Same as `record`, but runs against a transaction client the caller
   * already holds open, so e.g. a membership row and its purchase
   * transaction either both commit or both roll back together — never one
   * without the other. Prisma has no nested-transaction support, so this
   * must never call `runSerializableTransaction`/`$transaction` itself.
   */
  async recordWithinTransaction(
    tx: Prisma.TransactionClient,
    tenantId: string,
    input: RecordTransactionInput,
  ): Promise<TransactionResponseDto> {
    if (input.status !== TransactionStatus.PENDING && input.status !== TransactionStatus.PAID) {
      throw new BadRequestException('A new transaction can only be recorded as PENDING or PAID.');
    }

    if (input.idempotencyKey) {
      const existing = await tx.transaction.findUnique({
        where: { tenantId_idempotencyKey: { tenantId, idempotencyKey: input.idempotencyKey } },
        include: transactionInclude,
      });
      if (existing) {
        return toTransactionResponse(existing);
      }
    }

    await this.membersService.getMemberInTenant(tenantId, input.memberId);
    const tenant = await tx.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { currency: true } });

    const transaction = await tx.transaction.create({
      data: {
        tenantId,
        memberId: input.memberId,
        type: input.type,
        description: input.description,
        amount: input.amount,
        currency: tenant.currency,
        method: input.method,
        status: input.status,
        relatedMembershipId: input.relatedMembershipId,
        relatedPtSessionId: input.relatedPtSessionId,
        relatedClassBookingId: input.relatedClassBookingId,
        recordedByUserId: input.recordedByUserId,
        idempotencyKey: input.idempotencyKey,
        paidAt: input.status === TransactionStatus.PAID ? new Date() : null,
      },
    });

    await this.invoicesService.createForTransaction(tx, tenantId, transaction);

    const withRelations = await tx.transaction.findUniqueOrThrow({ where: { id: transaction.id }, include: transactionInclude });
    return toTransactionResponse(withRelations);
  }

  /** The manual "Record a payment" staff action — see CreateTransactionDto's own comment. Always immediately PAID. */
  async recordManual(tenantId: string, recordedByUserId: string, dto: CreateTransactionDto): Promise<TransactionResponseDto> {
    return this.record(tenantId, {
      memberId: dto.memberId,
      type: dto.type,
      description: dto.description,
      amount: dto.amount,
      method: dto.method,
      status: TransactionStatus.PAID,
      relatedMembershipId: dto.relatedMembershipId,
      recordedByUserId,
      idempotencyKey: dto.idempotencyKey,
    });
  }

  async findByIdInTenant(tenantId: string, id: string): Promise<TransactionResponseDto> {
    const transaction = await this.getRawInTenant(tenantId, id);
    return toTransactionResponse(transaction);
  }

  async findOwnByIdInTenant(tenantId: string, userId: string, id: string): Promise<TransactionResponseDto> {
    const memberId = await this.membersService.getOwnMemberId(tenantId, userId);
    const transaction = await this.getRawInTenant(tenantId, id);
    if (transaction.memberId !== memberId) {
      throw new ForbiddenException("You don't have access to this transaction.");
    }
    return toTransactionResponse(transaction);
  }

  async listOwn(tenantId: string, userId: string, query: ListTransactionsQueryDto): Promise<PaginatedResult<TransactionResponseDto>> {
    const memberId = await this.membersService.getOwnMemberId(tenantId, userId);
    return this.list(tenantId, { ...query, memberId, skip: query.skip });
  }

  async list(tenantId: string, query: ListTransactionsQueryDto): Promise<PaginatedResult<TransactionResponseDto>> {
    const where: Prisma.TransactionWhereInput = {
      tenantId,
      ...(query.memberId ? { memberId: query.memberId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.method ? { method: query.method } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(`${query.dateTo}T23:59:59.999Z`) } : {}),
            },
          }
        : {}),
      ...(query.amountMin !== undefined || query.amountMax !== undefined
        ? {
            amount: {
              ...(query.amountMin !== undefined ? { gte: query.amountMin } : {}),
              ...(query.amountMax !== undefined ? { lte: query.amountMax } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            member: {
              OR: [
                { firstName: { contains: query.search, mode: 'insensitive' as const } },
                { lastName: { contains: query.search, mode: 'insensitive' as const } },
              ],
            },
          }
        : {}),
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: query.sortOrder },
        include: transactionInclude,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return new PaginatedResult(items.map(toTransactionResponse), totalItems, query.page, query.limit);
  }

  async markPaid(tenantId: string, id: string): Promise<TransactionResponseDto> {
    await this.transitionFromPending(tenantId, id, { status: TransactionStatus.PAID, paidAt: new Date() });
    const result = await this.findByIdInTenant(tenantId, id);
    this.eventEmitter.emit(NOTIFICATION_EVENTS.TRANSACTION_PAID, {
      tenantId,
      memberId: result.member.id,
      transactionId: result.id,
      amount: result.amount,
      currency: result.currency,
      description: result.description,
    });
    return result;
  }

  /** Notifies both the member and authorized staff — see NotificationsEventListener.onTransactionFailed. */
  async markFailed(tenantId: string, id: string, reason?: string): Promise<TransactionResponseDto> {
    await this.transitionFromPending(tenantId, id, { status: TransactionStatus.FAILED, failureReason: reason });
    const result = await this.findByIdInTenant(tenantId, id);
    this.eventEmitter.emit(NOTIFICATION_EVENTS.TRANSACTION_FAILED, {
      tenantId,
      memberId: result.member.id,
      transactionId: result.id,
      amount: result.amount,
      currency: result.currency,
      description: result.description,
      reason,
    });
    return result;
  }

  async cancel(tenantId: string, id: string): Promise<TransactionResponseDto> {
    await this.transitionFromPending(tenantId, id, { status: TransactionStatus.CANCELLED, cancelledAt: new Date() });
    return this.findByIdInTenant(tenantId, id);
  }

  /**
   * A single atomic `updateMany` guarded by the expected current status —
   * safe against two staff members racing to transition the same pending
   * transaction without needing full Serializable isolation (there's no
   * "read an aggregate, then decide" step here, just one row's own state).
   */
  private async transitionFromPending(
    tenantId: string,
    id: string,
    data: { status: TransactionStatus; paidAt?: Date; failureReason?: string; cancelledAt?: Date },
  ): Promise<void> {
    const existing = await this.prisma.transaction.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new NotFoundException('Transaction not found.');
    }
    const result = await this.prisma.transaction.updateMany({
      where: { id, tenantId, status: { in: [TransactionStatus.PENDING, TransactionStatus.PROCESSING] } },
      data,
    });
    if (result.count === 0) {
      throw new BadRequestException(`Cannot transition a transaction with status ${existing.status}.`);
    }
  }

  /**
   * Issues a refund against a PAID or already PARTIALLY_REFUNDED
   * transaction. `amount` omitted means a full refund of whatever's still
   * refundable. Runs inside a Serializable transaction: reading the sum
   * of existing refunds and deciding the new remaining amount is exactly
   * the check-then-insert race this codebase's other concurrency-sensitive
   * flows (class capacity, membership overlap) already guard the same way.
   */
  async refund(
    tenantId: string,
    transactionId: string,
    input: { amount?: number; reason?: string; processedByUserId?: string },
  ): Promise<RefundResponseDto> {
    const result = await runSerializableTransaction(this.prisma, async (tx) => {
      const transaction = await tx.transaction.findFirst({ where: { id: transactionId, tenantId } });
      if (!transaction) {
        throw new NotFoundException('Transaction not found.');
      }
      if (transaction.status !== TransactionStatus.PAID && transaction.status !== TransactionStatus.PARTIALLY_REFUNDED) {
        throw new BadRequestException(`Cannot refund a transaction with status ${transaction.status}.`);
      }

      const existingRefunds = await tx.refund.findMany({
        where: { transactionId, status: RefundStatus.COMPLETED },
        select: { amount: true },
      });
      const refundedSoFar = existingRefunds.reduce((sum, r) => sum.plus(r.amount), new Prisma.Decimal(0));
      const remaining = new Prisma.Decimal(transaction.amount).minus(refundedSoFar);

      const refundAmount = input.amount !== undefined ? new Prisma.Decimal(input.amount) : remaining;
      if (refundAmount.lessThanOrEqualTo(0)) {
        throw new BadRequestException('Refund amount must be greater than zero.');
      }
      if (refundAmount.greaterThan(remaining)) {
        throw new BadRequestException(`Refund amount exceeds the remaining refundable amount of ${remaining.toFixed(2)}.`);
      }

      const now = new Date();
      const refund = await tx.refund.create({
        data: {
          tenantId,
          transactionId,
          amount: refundAmount,
          reason: input.reason,
          status: RefundStatus.COMPLETED,
          processedByUserId: input.processedByUserId,
          completedAt: now,
        },
      });

      const newTotal = refundedSoFar.plus(refundAmount);
      const newStatus = newTotal.greaterThanOrEqualTo(transaction.amount)
        ? TransactionStatus.REFUNDED
        : TransactionStatus.PARTIALLY_REFUNDED;
      await tx.transaction.update({ where: { id: transactionId }, data: { status: newStatus } });

      const withRelations = await tx.refund.findUniqueOrThrow({
        where: { id: refund.id },
        include: { transaction: { select: { id: true, amount: true, invoice: { select: { invoiceNumber: true } } } }, processedByUser: { select: { id: true, firstName: true, lastName: true } } },
      });
      return { refund: toRefundResponse(withRelations), memberId: transaction.memberId, currency: transaction.currency, isFullRefund: newStatus === TransactionStatus.REFUNDED };
    });

    this.eventEmitter.emit(NOTIFICATION_EVENTS.TRANSACTION_REFUNDED, {
      tenantId,
      memberId: result.memberId,
      transactionId,
      refundId: result.refund.id,
      amount: result.refund.amount,
      currency: result.currency,
      isFullRefund: result.isFullRefund,
    });
    return result.refund;
  }

  /**
   * A first data source for the Reports module, not a reimplementation of
   * it — total/pending/failed/refunded summaries plus revenue broken down
   * by type and method, over an optional date range. Only PAID
   * transactions ever count as revenue, matching the approved frontend's
   * own revenue helpers (`getRevenueInRange` et al.), which only ever
   * look at `status === "paid"`.
   */
  async getStats(tenantId: string, range?: { from?: string; to?: string }) {
    const dateWhere =
      range?.from || range?.to
        ? {
            createdAt: {
              ...(range.from ? { gte: new Date(range.from) } : {}),
              ...(range.to ? { lte: new Date(`${range.to}T23:59:59.999Z`) } : {}),
            },
          }
        : {};

    const [paidAgg, pendingAgg, failedCount, refundedAgg, byType, byMethod] = await Promise.all([
      this.prisma.transaction.aggregate({ where: { tenantId, status: TransactionStatus.PAID, ...dateWhere }, _sum: { amount: true }, _count: true }),
      this.prisma.transaction.aggregate({ where: { tenantId, status: TransactionStatus.PENDING, ...dateWhere }, _sum: { amount: true } }),
      this.prisma.transaction.count({ where: { tenantId, status: TransactionStatus.FAILED, ...dateWhere } }),
      this.prisma.refund.aggregate({ where: { tenantId, status: RefundStatus.COMPLETED, ...(range?.from || range?.to ? { createdAt: dateWhere.createdAt } : {}) }, _sum: { amount: true } }),
      this.prisma.transaction.groupBy({ by: ['type'], where: { tenantId, status: TransactionStatus.PAID, ...dateWhere }, _sum: { amount: true } }),
      this.prisma.transaction.groupBy({ by: ['method'], where: { tenantId, status: TransactionStatus.PAID, ...dateWhere }, _sum: { amount: true } }),
    ]);

    return {
      totalRevenue: Number(paidAgg._sum.amount ?? 0),
      paidCount: paidAgg._count,
      pendingAmount: Number(pendingAgg._sum.amount ?? 0),
      failedCount,
      refundedAmount: Number(refundedAgg._sum.amount ?? 0),
      revenueByType: byType.map((row) => ({ type: row.type, amount: Number(row._sum.amount ?? 0) })),
      revenueByMethod: byMethod.map((row) => ({ method: row.method, amount: Number(row._sum.amount ?? 0) })),
    };
  }

  private async getRawInTenant(tenantId: string, id: string): Promise<TransactionWithRelations> {
    const transaction = await this.prisma.transaction.findFirst({ where: { id, tenantId }, include: transactionInclude });
    if (!transaction) {
      throw new NotFoundException('Transaction not found.');
    }
    return transaction;
  }
}
