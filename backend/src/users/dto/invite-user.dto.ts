import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { UserRole } from '../../generated/prisma/enums.js';

export class InviteUserDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[+()\d][\d\s()+-]{5,19}$/, { message: 'phone must be a valid phone number' })
  phone?: string;

  @ApiProperty({
    enum: UserRole,
    description: 'Staff role to invite — MEMBER accounts are created via public registration, not invited.',
  })
  @IsEnum(UserRole)
  role!: UserRole;
}
