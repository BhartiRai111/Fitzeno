import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class BusinessHoursEntryDto {
  @ApiProperty({ example: 'Monday – Friday' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  day!: string;

  @ApiProperty({ example: '6:00 AM – 9:00 PM' })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  time!: string;
}
