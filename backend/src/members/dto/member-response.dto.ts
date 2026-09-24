import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MemberStatus } from '../../generated/prisma/enums.js';
import type { Member } from '../../generated/prisma/client.js';
import { toMemberNoteResponse, MemberNoteResponseDto } from './member-note-response.dto.js';

class TrainerSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
}

class ConvertedFromLeadSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() source!: string;
  @ApiPropertyOptional({ nullable: true }) interest!: string | null;
}

export class MemberResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiPropertyOptional({ nullable: true }) userId!: string | null;

  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiPropertyOptional({ nullable: true }) email!: string | null;
  @ApiPropertyOptional({ nullable: true }) phone!: string | null;

  @ApiPropertyOptional({ nullable: true }) gender!: string | null;
  @ApiPropertyOptional({ nullable: true }) dateOfBirth!: Date | null;
  @ApiPropertyOptional({ nullable: true }) addressLine!: string | null;
  @ApiPropertyOptional({ nullable: true }) emergencyContactName!: string | null;
  @ApiPropertyOptional({ nullable: true }) emergencyContactPhone!: string | null;

  @ApiProperty({ enum: MemberStatus }) status!: MemberStatus;
  @ApiProperty() joinedOn!: Date;

  @ApiPropertyOptional({ type: TrainerSummaryDto, nullable: true }) trainer!: TrainerSummaryDto | null;
  @ApiPropertyOptional({ type: ConvertedFromLeadSummaryDto, nullable: true })
  convertedFromLead!: ConvertedFromLeadSummaryDto | null;

  @ApiProperty({ type: [MemberNoteResponseDto] }) notes!: MemberNoteResponseDto[];

  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

/** List rows skip notes and lead detail — kept for the single-record GET only. */
export class MemberSummaryResponseDto {
  @ApiProperty() id!: string;
  @ApiPropertyOptional({ nullable: true }) userId!: string | null;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiPropertyOptional({ nullable: true }) email!: string | null;
  @ApiPropertyOptional({ nullable: true }) phone!: string | null;
  @ApiProperty({ enum: MemberStatus }) status!: MemberStatus;
  @ApiProperty() joinedOn!: Date;
  @ApiPropertyOptional({ type: TrainerSummaryDto, nullable: true }) trainer!: TrainerSummaryDto | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export type MemberSummaryWithRelations = Member & {
  trainer: { id: string; firstName: string; lastName: string } | null;
};

export function toMemberSummaryResponse(member: MemberSummaryWithRelations): MemberSummaryResponseDto {
  return {
    id: member.id,
    userId: member.userId,
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
    phone: member.phone,
    status: member.status,
    joinedOn: member.joinedOn,
    trainer: member.trainer,
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
  };
}

export type MemberWithRelations = Member & {
  trainer: { id: string; firstName: string; lastName: string } | null;
  convertedFromLead: { id: string; source: string; interest: string | null } | null;
  notes: Parameters<typeof toMemberNoteResponse>[0][];
};

export function toMemberResponse(member: MemberWithRelations): MemberResponseDto {
  return {
    id: member.id,
    tenantId: member.tenantId,
    userId: member.userId,
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
    phone: member.phone,
    gender: member.gender,
    dateOfBirth: member.dateOfBirth,
    addressLine: member.addressLine,
    emergencyContactName: member.emergencyContactName,
    emergencyContactPhone: member.emergencyContactPhone,
    status: member.status,
    joinedOn: member.joinedOn,
    trainer: member.trainer,
    convertedFromLead: member.convertedFromLead,
    notes: member.notes.map(toMemberNoteResponse),
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
  };
}
