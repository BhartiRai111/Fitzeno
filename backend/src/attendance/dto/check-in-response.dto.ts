import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CheckInMethod } from '../../generated/prisma/enums.js';
import type { CheckIn } from '../../generated/prisma/client.js';

class CheckInMemberSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
}

export class CheckInResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ type: CheckInMemberSummaryDto }) member!: CheckInMemberSummaryDto;
  @ApiProperty({ enum: CheckInMethod }) method!: CheckInMethod;
  @ApiPropertyOptional({ nullable: true, description: 'The staff user who recorded this — null for a member\'s own self check-in.' })
  recordedByUserId!: string | null;
  @ApiProperty() checkInAt!: Date;
  @ApiPropertyOptional({ nullable: true }) checkOutAt!: Date | null;
  @ApiProperty() createdAt!: Date;
}

export type CheckInWithMember = CheckIn & { member: { id: string; firstName: string; lastName: string } };

export function toCheckInResponse(checkIn: CheckInWithMember): CheckInResponseDto {
  return {
    id: checkIn.id,
    member: checkIn.member,
    method: checkIn.method,
    recordedByUserId: checkIn.recordedByUserId,
    checkInAt: checkIn.checkInAt,
    checkOutAt: checkIn.checkOutAt,
    createdAt: checkIn.createdAt,
  };
}

/** Why a check-in attempt was turned away — see CheckInDeniedEvent's own comment on which of these actually notify staff. */
export type CheckInDenialReason = 'MEMBERSHIP_EXPIRED' | 'MEMBERSHIP_FROZEN' | 'MEMBERSHIP_CANCELLED' | 'NO_MEMBERSHIP' | 'MEMBER_INACTIVE';

export const CHECK_IN_DENIAL_MESSAGES: Record<CheckInDenialReason, string> = {
  MEMBERSHIP_EXPIRED: 'Your membership has expired. Renew at the front desk or online to check in again.',
  MEMBERSHIP_FROZEN: 'Your membership is frozen. Unfreeze it from Billing to resume check-ins.',
  MEMBERSHIP_CANCELLED: 'Your membership has been cancelled. Contact the front desk to reactivate.',
  NO_MEMBERSHIP: "You don't have an active membership yet. Speak to the front desk to get set up.",
  MEMBER_INACTIVE: 'Your account is currently inactive. Contact the front desk for help.',
};

/** Every state a check-in attempt can land in — see the phase-level schema comment for why this is a 200 business outcome, not an HTTP error, once a real member has been identified. */
export type CheckInOutcome = 'CHECKED_IN' | 'ALREADY_CHECKED_IN' | 'DENIED';

export class CheckInAttemptResponseDto {
  @ApiProperty({ enum: ['CHECKED_IN', 'ALREADY_CHECKED_IN', 'DENIED'] }) outcome!: CheckInOutcome;
  @ApiPropertyOptional({ enum: ['MEMBERSHIP_EXPIRED', 'MEMBERSHIP_FROZEN', 'MEMBERSHIP_CANCELLED', 'NO_MEMBERSHIP', 'MEMBER_INACTIVE'], nullable: true })
  denialReason!: CheckInDenialReason | null;
  @ApiProperty() message!: string;
  @ApiPropertyOptional({ type: CheckInResponseDto, nullable: true }) checkIn!: CheckInResponseDto | null;
}

export class CheckInStatusResponseDto {
  @ApiProperty() checkedIn!: boolean;
  @ApiPropertyOptional({ type: CheckInResponseDto, nullable: true }) checkIn!: CheckInResponseDto | null;
}

export class CheckInTokenResponseDto {
  @ApiProperty({ description: 'Opaque, single-use token — encode this as the QR payload. Only ever returned once, at issuance.' })
  token!: string;
  @ApiProperty() expiresAt!: Date;
  @ApiProperty() expiresInSeconds!: number;
}

export class TodayAttendanceResponseDto {
  @ApiProperty({ type: [CheckInResponseDto] }) items!: CheckInResponseDto[];
  @ApiProperty() totalToday!: number;
  @ApiProperty() currentlyIn!: number;
}

export class AttendanceStatsPointDto {
  @ApiProperty({ description: 'YYYY-MM-DD' }) date!: string;
  @ApiProperty() visits!: number;
}

export class InactiveMemberResponseDto {
  @ApiProperty() memberId!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiPropertyOptional({ nullable: true }) lastCheckInAt!: Date | null;
  @ApiPropertyOptional({ nullable: true, description: 'Null when this member has never checked in at all.' })
  daysSinceLastVisit!: number | null;
}
