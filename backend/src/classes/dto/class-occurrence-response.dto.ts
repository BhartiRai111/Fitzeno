import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClassOccurrenceStatus } from '../../generated/prisma/enums.js';
import type { ClassOccurrence } from '../../generated/prisma/client.js';

class OccurrenceTrainerSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
}

export class ClassOccurrenceResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() classSeriesId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() category!: string;
  @ApiProperty() date!: Date;
  @ApiProperty() startTime!: string;
  @ApiProperty() endTime!: string;
  @ApiProperty({ type: OccurrenceTrainerSummaryDto }) trainer!: OccurrenceTrainerSummaryDto;
  @ApiProperty() location!: string;
  @ApiProperty() capacity!: number;
  @ApiProperty() confirmedCount!: number;
  @ApiProperty() waitlistCount!: number;
  @ApiProperty() seatsAvailable!: number;
  @ApiProperty({ enum: ClassOccurrenceStatus }) status!: ClassOccurrenceStatus;
  @ApiPropertyOptional({ nullable: true }) cancelledReason!: string | null;
  /** Only present when the response is for the current caller (a member's own booking status on this occurrence). */
  @ApiPropertyOptional({ nullable: true }) myBookingStatus?: string | null;
}

export type ClassOccurrenceWithRelations = ClassOccurrence & {
  classSeries: { name: string; category: string };
  trainer: { id: string; firstName: string; lastName: string };
  bookings: { status: string; memberId: string }[];
};

export function toClassOccurrenceResponse(
  occurrence: ClassOccurrenceWithRelations,
  callerMemberId?: string,
): ClassOccurrenceResponseDto {
  const confirmedCount = occurrence.bookings.filter((b) => b.status === 'CONFIRMED').length;
  const waitlistCount = occurrence.bookings.filter((b) => b.status === 'WAITLISTED').length;
  const myBooking = callerMemberId ? occurrence.bookings.find((b) => b.memberId === callerMemberId) : undefined;

  return {
    id: occurrence.id,
    classSeriesId: occurrence.classSeriesId,
    name: occurrence.classSeries.name,
    category: occurrence.classSeries.category,
    date: occurrence.date,
    startTime: occurrence.startTime,
    endTime: occurrence.endTime,
    trainer: occurrence.trainer,
    location: occurrence.location,
    capacity: occurrence.capacity,
    confirmedCount,
    waitlistCount,
    seatsAvailable: Math.max(0, occurrence.capacity - confirmedCount),
    status: occurrence.status,
    cancelledReason: occurrence.cancelledReason,
    ...(callerMemberId ? { myBookingStatus: myBooking?.status ?? null } : {}),
  };
}
