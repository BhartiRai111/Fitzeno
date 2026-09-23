import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsInt, Max, Min } from 'class-validator';

export class MembershipPolicyDto {
  @ApiProperty({ minimum: 0, maximum: 12 })
  @IsInt()
  @Min(0)
  @Max(12)
  freezesPerYear!: number;

  @ApiProperty({ minimum: 0, maximum: 365 })
  @IsInt()
  @Min(0)
  @Max(365)
  maxFreezeDurationDays!: number;

  @ApiProperty({ minimum: 0, maximum: 90 })
  @IsInt()
  @Min(0)
  @Max(90)
  cancellationNoticeDays!: number;

  @ApiProperty({
    type: [Number],
    description: 'Days before expiry to send a renewal reminder, e.g. [14, 7, 1].',
  })
  @IsArray()
  @ArrayMaxSize(6)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(90, { each: true })
  renewalReminderDaysBefore!: number[];
}
