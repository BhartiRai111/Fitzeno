import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

/** CONFIRMED reverts a previously-marked session back to pending — matches the approved frontend's "revert to booked" action. */
export type PtAttendanceMarkStatus = 'CONFIRMED' | 'COMPLETED' | 'NO_SHOW';

export class MarkPtAttendanceDto {
  @ApiProperty({ enum: ['CONFIRMED', 'COMPLETED', 'NO_SHOW'] })
  @IsIn(['CONFIRMED', 'COMPLETED', 'NO_SHOW'])
  status!: PtAttendanceMarkStatus;
}
