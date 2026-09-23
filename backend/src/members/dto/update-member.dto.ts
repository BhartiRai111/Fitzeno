import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsEnum, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';
import { MemberStatus } from '../../generated/prisma/enums.js';

const PHONE_PATTERN = /^[+()\d][\d\s()+-]{5,19}$/;

export class UpdateMemberDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(PHONE_PATTERN, { message: 'phone must be a valid phone number' })
  phone?: string;

  @ApiPropertyOptional()
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

  @ApiPropertyOptional({ enum: MemberStatus })
  @IsOptional()
  @IsEnum(MemberStatus)
  status?: MemberStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  joinedOn?: string;

  @ApiPropertyOptional({
    description: 'Must reference a TRAINER in this gym. Pass null to unassign.',
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  trainerId?: string | null;
}
