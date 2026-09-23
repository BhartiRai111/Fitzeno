import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreatePtSessionDto {
  @ApiProperty()
  @IsUUID()
  trainerId!: string;

  @ApiProperty({ description: 'The calendar date of the session.' })
  @IsDateString()
  date!: string;

  @ApiProperty({ example: '09:00' })
  @Matches(TIME_PATTERN, { message: 'startTime must be in HH:mm 24-hour format' })
  startTime!: string;

  @ApiProperty({ example: 60, minimum: 15, maximum: 240 })
  @IsInt()
  @Min(15)
  @Max(240)
  durationMinutes!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

/** Staff booking on behalf of a member — same as CreatePtSessionDto plus who it's for. */
export class CreatePtSessionForMemberDto extends CreatePtSessionDto {
  @ApiProperty()
  @IsUUID()
  memberId!: string;
}
