import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

const PHONE_PATTERN = /^[+()\d][\d\s()+-]{5,19}$/;

export class CreateMemberDto {
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

  @ApiPropertyOptional({ description: 'Free text — not a closed set.' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  gender?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  emergencyContactName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(PHONE_PATTERN, { message: 'emergencyContactPhone must be a valid phone number' })
  emergencyContactPhone?: string;

  @ApiPropertyOptional({ description: 'Must reference a TRAINER in this gym.' })
  @IsOptional()
  @IsUUID()
  trainerId?: string;

  @ApiPropertyOptional({ description: 'Defaults to today.' })
  @IsOptional()
  @IsDateString()
  joinedOn?: string;
}
