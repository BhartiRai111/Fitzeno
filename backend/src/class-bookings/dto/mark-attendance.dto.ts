import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

/** CONFIRMED reverts a previously-marked booking back to pending — matches the approved frontend's "revert to booked" action. */
export type AttendanceMarkStatus = 'CONFIRMED' | 'ATTENDED' | 'NO_SHOW';

export class MarkAttendanceDto {
  @ApiProperty({ enum: ['CONFIRMED', 'ATTENDED', 'NO_SHOW'] })
  @IsIn(['CONFIRMED', 'ATTENDED', 'NO_SHOW'])
  status!: AttendanceMarkStatus;
}
