import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsEnum, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';
import { LeadSource } from '../../generated/prisma/enums.js';

const PHONE_PATTERN = /^[+()\d][\d\s()+-]{5,19}$/;

export class CreateLeadDto {
  @ApiProperty({ example: 'Jordan' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ example: 'Smith' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+44 7700 900123' })
  @IsOptional()
  @IsString()
  @Matches(PHONE_PATTERN, { message: 'phone must be a valid phone number' })
  phone?: string;

  @ApiProperty({ enum: LeadSource })
  @IsEnum(LeadSource)
  source!: LeadSource;

  @ApiPropertyOptional({ example: 'Weight loss' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  interest?: string;

  @ApiPropertyOptional({ description: 'Staff member responsible for following up — must be a non-member in this gym.' })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  nextFollowUpAt?: string;
}
