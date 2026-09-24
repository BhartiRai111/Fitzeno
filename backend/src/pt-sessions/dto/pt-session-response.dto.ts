import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PtSessionStatus } from '../../generated/prisma/enums.js';
import type { PersonalTrainingSession } from '../../generated/prisma/client.js';

class PtTrainerSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
}

class PtMemberSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
}

export class PtSessionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ type: PtTrainerSummaryDto }) trainer!: PtTrainerSummaryDto;
  @ApiProperty({ type: PtMemberSummaryDto }) member!: PtMemberSummaryDto;
  @ApiProperty() date!: Date;
  @ApiProperty() startTime!: string;
  @ApiProperty() durationMinutes!: number;
  @ApiProperty({ enum: PtSessionStatus }) status!: PtSessionStatus;
  @ApiPropertyOptional({ nullable: true }) notes!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export type PtSessionWithRelations = PersonalTrainingSession & {
  trainer: { id: string; firstName: string; lastName: string };
  member: { id: string; firstName: string; lastName: string };
};

export function toPtSessionResponse(session: PtSessionWithRelations): PtSessionResponseDto {
  return {
    id: session.id,
    trainer: session.trainer,
    member: session.member,
    date: session.date,
    startTime: session.startTime,
    durationMinutes: session.durationMinutes,
    status: session.status,
    notes: session.notes,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

export class FreeSlotDto {
  @ApiProperty() startTime!: string;
  @ApiProperty() endTime!: string;
}
