import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class CreateClassBookingDto {
  @ApiProperty()
  @IsUUID()
  classOccurrenceId!: string;
}

/** Staff booking on behalf of a member — same as CreateClassBookingDto plus who it's for. */
export class CreateClassBookingForMemberDto extends CreateClassBookingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  memberId!: string;
}
