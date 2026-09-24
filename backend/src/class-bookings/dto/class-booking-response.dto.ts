import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClassBookingStatus } from '../../generated/prisma/enums.js';
import type { ClassBooking } from '../../generated/prisma/client.js';

class BookingMemberSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
}

class BookingOccurrenceSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() date!: Date;
  @ApiProperty() startTime!: string;
  @ApiProperty() location!: string;
}

export class ClassBookingResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ type: BookingOccurrenceSummaryDto }) classOccurrence!: BookingOccurrenceSummaryDto;
  @ApiProperty({ type: BookingMemberSummaryDto }) member!: BookingMemberSummaryDto;
  @ApiProperty({ enum: ClassBookingStatus }) status!: ClassBookingStatus;
  @ApiProperty() bookedAt!: Date;
  @ApiPropertyOptional({ nullable: true }) cancelledAt!: Date | null;
  @ApiProperty() createdAt!: Date;
}

export type ClassBookingWithRelations = ClassBooking & {
  classOccurrence: { id: string; date: Date; startTime: string; location: string; classSeries: { name: string } };
  member: { id: string; firstName: string; lastName: string };
};

export function toClassBookingResponse(booking: ClassBookingWithRelations): ClassBookingResponseDto {
  return {
    id: booking.id,
    classOccurrence: {
      id: booking.classOccurrence.id,
      name: booking.classOccurrence.classSeries.name,
      date: booking.classOccurrence.date,
      startTime: booking.classOccurrence.startTime,
      location: booking.classOccurrence.location,
    },
    member: booking.member,
    status: booking.status,
    bookedAt: booking.bookedAt,
    cancelledAt: booking.cancelledAt,
    createdAt: booking.createdAt,
  };
}
