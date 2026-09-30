import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { CheckInMethod } from '../../generated/prisma/enums.js';

/** Staff front-desk check-in on behalf of a member. */
export class CreateCheckInDto {
  @ApiProperty()
  @IsUUID()
  memberId!: string;

  @ApiPropertyOptional({ enum: [CheckInMethod.MANUAL, CheckInMethod.KIOSK], default: CheckInMethod.MANUAL })
  @IsOptional()
  @IsEnum(CheckInMethod)
  method?: typeof CheckInMethod.MANUAL | typeof CheckInMethod.KIOSK;
}
