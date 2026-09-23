import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsEnum, IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';
import { LeadLostReason, LeadSource } from '../../generated/prisma/enums.js';

const PHONE_PATTERN = /^[+()\d][\d\s()+-]{5,19}$/;

/**
 * Deliberately excludes CONVERTED — that transition only happens through
 * POST /leads/:id/convert, which also creates/links the Member record.
 * Allowing a plain status PATCH to set CONVERTED would let a lead end up
 * flagged converted with nothing on the other end of it.
 */
const PATCHABLE_STATUSES = ['NEW', 'CONTACTED', 'FOLLOW_UP', 'TRIAL_SCHEDULED', 'TRIAL_COMPLETED', 'LOST'] as const;
export type PatchableLeadStatus = (typeof PATCHABLE_STATUSES)[number];

export class UpdateLeadDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(PHONE_PATTERN, { message: 'phone must be a valid phone number' })
  phone?: string;

  @ApiPropertyOptional({ enum: LeadSource })
  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  interest?: string;

  @ApiPropertyOptional({ enum: PATCHABLE_STATUSES })
  @IsOptional()
  @IsIn(PATCHABLE_STATUSES)
  status?: PatchableLeadStatus;

  @ApiPropertyOptional({ enum: LeadLostReason })
  @IsOptional()
  @IsEnum(LeadLostReason)
  lostReason?: LeadLostReason;

  @ApiPropertyOptional({ description: 'Pass null to unassign.', nullable: true })
  @IsOptional()
  @IsUUID()
  assignedToId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString()
  nextFollowUpAt?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString()
  trialScheduledAt?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  trialNotes?: string | null;
}
