import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeadLostReason, LeadSource, LeadStatus } from '../../generated/prisma/enums.js';
import type { Lead } from '../../generated/prisma/client.js';
import { toLeadNoteResponse, LeadNoteResponseDto } from './lead-note-response.dto.js';

class AssigneeSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
}

export class LeadResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;

  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiPropertyOptional({ nullable: true }) email!: string | null;
  @ApiPropertyOptional({ nullable: true }) phone!: string | null;

  @ApiProperty({ enum: LeadSource }) source!: LeadSource;
  @ApiPropertyOptional({ nullable: true }) interest!: string | null;

  @ApiProperty({ enum: LeadStatus }) status!: LeadStatus;
  @ApiPropertyOptional({ enum: LeadLostReason, nullable: true }) lostReason!: LeadLostReason | null;

  @ApiPropertyOptional({ type: AssigneeSummaryDto, nullable: true }) assignedTo!: AssigneeSummaryDto | null;

  @ApiPropertyOptional({ nullable: true }) nextFollowUpAt!: Date | null;
  @ApiPropertyOptional({ nullable: true }) trialScheduledAt!: Date | null;
  @ApiPropertyOptional({ nullable: true }) trialNotes!: string | null;

  @ApiPropertyOptional({ nullable: true }) convertedAt!: Date | null;
  @ApiPropertyOptional({ nullable: true, description: 'Set once this lead has converted.' }) convertedMemberId!:
    | string
    | null;

  @ApiProperty({ type: [LeadNoteResponseDto] }) notes!: LeadNoteResponseDto[];

  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

/** List rows skip notes — kept for the single-record GET only. */
export class LeadSummaryResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiPropertyOptional({ nullable: true }) email!: string | null;
  @ApiPropertyOptional({ nullable: true }) phone!: string | null;
  @ApiProperty({ enum: LeadSource }) source!: LeadSource;
  @ApiProperty({ enum: LeadStatus }) status!: LeadStatus;
  @ApiPropertyOptional({ type: AssigneeSummaryDto, nullable: true }) assignedTo!: AssigneeSummaryDto | null;
  @ApiPropertyOptional({ nullable: true }) nextFollowUpAt!: Date | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export type LeadSummaryWithRelations = Lead & {
  assignedTo: { id: string; firstName: string; lastName: string } | null;
};

export function toLeadSummaryResponse(lead: LeadSummaryWithRelations): LeadSummaryResponseDto {
  return {
    id: lead.id,
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    phone: lead.phone,
    source: lead.source,
    status: lead.status,
    assignedTo: lead.assignedTo,
    nextFollowUpAt: lead.nextFollowUpAt,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  };
}

export type LeadWithRelations = Lead & {
  assignedTo: { id: string; firstName: string; lastName: string } | null;
  convertedMember: { id: string } | null;
  notes: Parameters<typeof toLeadNoteResponse>[0][];
};

export function toLeadResponse(lead: LeadWithRelations): LeadResponseDto {
  return {
    id: lead.id,
    tenantId: lead.tenantId,
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    phone: lead.phone,
    source: lead.source,
    interest: lead.interest,
    status: lead.status,
    lostReason: lead.lostReason,
    assignedTo: lead.assignedTo,
    nextFollowUpAt: lead.nextFollowUpAt,
    trialScheduledAt: lead.trialScheduledAt,
    trialNotes: lead.trialNotes,
    convertedAt: lead.convertedAt,
    convertedMemberId: lead.convertedMember?.id ?? null,
    notes: lead.notes.map(toLeadNoteResponse),
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  };
}
