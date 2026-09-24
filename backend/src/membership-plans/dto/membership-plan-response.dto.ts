import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillingPeriod, PlanStatus } from '../../generated/prisma/enums.js';
import type { MembershipPlan } from '../../generated/prisma/client.js';

export class MembershipPlanResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiProperty() price!: number;
  @ApiProperty({ enum: BillingPeriod }) billingPeriod!: BillingPeriod;
  @ApiProperty({ type: [String] }) perks!: string[];
  @ApiProperty() isPopular!: boolean;
  @ApiProperty({ enum: PlanStatus }) status!: PlanStatus;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export function toMembershipPlanResponse(plan: MembershipPlan): MembershipPlanResponseDto {
  return {
    id: plan.id,
    tenantId: plan.tenantId,
    name: plan.name,
    description: plan.description,
    price: Number(plan.price),
    billingPeriod: plan.billingPeriod,
    perks: plan.perks,
    isPopular: plan.isPopular,
    status: plan.status,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
}
