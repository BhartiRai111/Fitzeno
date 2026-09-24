import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillingPeriod, MembershipRecordStatus } from '../../generated/prisma/enums.js';
import type { MemberMembership } from '../../generated/prisma/client.js';

/** Purely derived from `status` + [startDate, endDate] vs today — see the model's own schema comment for why this is never itself stored. */
export type EffectiveMembershipStatus = 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'FROZEN' | 'CANCELLED';

class MembershipMemberSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
}

class MembershipPlanSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
}

export class MembershipResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty({ type: MembershipMemberSummaryDto }) member!: MembershipMemberSummaryDto;
  @ApiProperty({ type: MembershipPlanSummaryDto }) plan!: MembershipPlanSummaryDto;

  @ApiProperty({ description: 'Snapshot of the plan name at purchase/renewal time.' }) planName!: string;
  @ApiProperty({ description: 'Snapshot of the price at purchase/renewal time.' }) price!: number;
  @ApiProperty({ enum: BillingPeriod }) billingPeriod!: BillingPeriod;

  @ApiProperty() startDate!: Date;
  @ApiProperty() endDate!: Date;

  @ApiProperty({ enum: MembershipRecordStatus, description: 'The stored state — see EffectiveMembershipStatus for the date-aware view.' })
  status!: MembershipRecordStatus;
  @ApiProperty({ enum: ['PENDING', 'ACTIVE', 'EXPIRED', 'FROZEN', 'CANCELLED'] })
  effectiveStatus!: EffectiveMembershipStatus;
  @ApiProperty({ description: 'Negative once expired.' }) daysRemaining!: number;
  @ApiProperty() isExpiringSoon!: boolean;

  @ApiPropertyOptional({ nullable: true }) frozenAt!: Date | null;
  @ApiPropertyOptional({ nullable: true }) cancelledAt!: Date | null;
  @ApiPropertyOptional({ nullable: true }) cancellationReason!: string | null;

  @ApiPropertyOptional({ nullable: true }) paymentMethod!: string | null;
  @ApiPropertyOptional({ nullable: true }) paymentReference!: string | null;

  @ApiPropertyOptional({ nullable: true }) renewedFromId!: string | null;
  @ApiPropertyOptional({ nullable: true }) renewedIntoId!: string | null;

  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export type MembershipWithRelations = MemberMembership & {
  member: { id: string; firstName: string; lastName: string };
  plan: { id: string; name: string };
  renewedInto: { id: string } | null;
};

/** Days between two UTC-midnight dates, `to - from`, positive when `to` is later. */
function daysBetween(from: Date, to: Date): number {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

const EXPIRING_SOON_THRESHOLD_DAYS = 14;

export function computeEffectiveStatus(
  row: { status: MembershipRecordStatus; startDate: Date; endDate: Date },
  today: Date,
): EffectiveMembershipStatus {
  if (row.status === MembershipRecordStatus.CANCELLED) return 'CANCELLED';
  if (row.status === MembershipRecordStatus.FROZEN) return 'FROZEN';
  if (today < row.startDate) return 'PENDING';
  if (today > row.endDate) return 'EXPIRED';
  return 'ACTIVE';
}

export function toMembershipResponse(membership: MembershipWithRelations, today: Date): MembershipResponseDto {
  const effectiveStatus = computeEffectiveStatus(membership, today);
  const daysRemaining = daysBetween(today, membership.endDate);

  return {
    id: membership.id,
    tenantId: membership.tenantId,
    member: membership.member,
    plan: membership.plan,
    planName: membership.planName,
    price: Number(membership.price),
    billingPeriod: membership.billingPeriod,
    startDate: membership.startDate,
    endDate: membership.endDate,
    status: membership.status,
    effectiveStatus,
    daysRemaining,
    isExpiringSoon: effectiveStatus === 'ACTIVE' && daysRemaining <= EXPIRING_SOON_THRESHOLD_DAYS,
    frozenAt: membership.frozenAt,
    cancelledAt: membership.cancelledAt,
    cancellationReason: membership.cancellationReason,
    paymentMethod: membership.paymentMethod,
    paymentReference: membership.paymentReference,
    renewedFromId: membership.renewedFromId,
    renewedIntoId: membership.renewedInto?.id ?? null,
    createdAt: membership.createdAt,
    updatedAt: membership.updatedAt,
  };
}
