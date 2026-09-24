import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DayOfWeek, TrainerStatus } from '../../generated/prisma/enums.js';
import type { Trainer, TrainerAvailability } from '../../generated/prisma/client.js';

class TrainerUserSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiPropertyOptional({ nullable: true }) email!: string | null;
  @ApiPropertyOptional({ nullable: true }) phone!: string | null;
}

export class AvailabilitySlotResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: DayOfWeek }) dayOfWeek!: DayOfWeek;
  @ApiProperty() startTime!: string;
  @ApiProperty() endTime!: string;
}

export function toAvailabilitySlotResponse(slot: TrainerAvailability): AvailabilitySlotResponseDto {
  return { id: slot.id, dayOfWeek: slot.dayOfWeek, startTime: slot.startTime, endTime: slot.endTime };
}

export class TrainerResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty() userId!: string;
  @ApiProperty({ type: TrainerUserSummaryDto }) user!: TrainerUserSummaryDto;

  @ApiPropertyOptional({ nullable: true }) bio!: string | null;
  @ApiProperty({ type: [String] }) specialties!: string[];
  @ApiProperty({ type: [String] }) certifications!: string[];
  @ApiPropertyOptional({ nullable: true }) yearsExperience!: number | null;
  @ApiProperty({ enum: TrainerStatus }) status!: TrainerStatus;
  @ApiProperty() offersPersonalTraining!: boolean;

  @ApiProperty({ type: [AvailabilitySlotResponseDto] }) availability!: AvailabilitySlotResponseDto[];

  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export type TrainerWithRelations = Trainer & {
  user: { id: string; firstName: string; lastName: string; email: string | null; phone: string | null };
  availability: TrainerAvailability[];
};

export function toTrainerResponse(trainer: TrainerWithRelations): TrainerResponseDto {
  return {
    id: trainer.id,
    tenantId: trainer.tenantId,
    userId: trainer.userId,
    user: trainer.user,
    bio: trainer.bio,
    specialties: trainer.specialties,
    certifications: trainer.certifications,
    yearsExperience: trainer.yearsExperience,
    status: trainer.status,
    offersPersonalTraining: trainer.offersPersonalTraining,
    availability: trainer.availability
      .slice()
      .sort((a, b) => a.dayOfWeek.localeCompare(b.dayOfWeek) || a.startTime.localeCompare(b.startTime))
      .map(toAvailabilitySlotResponse),
    createdAt: trainer.createdAt,
    updatedAt: trainer.updatedAt,
  };
}
