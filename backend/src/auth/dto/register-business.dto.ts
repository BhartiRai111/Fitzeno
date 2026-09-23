import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '../password.service.js';

/** Creates a brand-new gym and its first user (the OWNER) in one step. */
export class RegisterBusinessDto {
  @ApiProperty({ example: 'Riverside Fitness Co.' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  businessName!: string;

  @ApiProperty({ example: 'owner@example.com' })
  @IsEmail()
  ownerEmail!: string;

  @ApiProperty({ minLength: MIN_PASSWORD_LENGTH, maxLength: MAX_PASSWORD_LENGTH })
  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH, { message: `ownerPassword must be at least ${MIN_PASSWORD_LENGTH} characters` })
  @MaxLength(MAX_PASSWORD_LENGTH)
  ownerPassword!: string;

  @ApiProperty({ example: 'Jordan' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  ownerFirstName!: string;

  @ApiProperty({ example: 'Smith' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  ownerLastName!: string;

  @ApiPropertyOptional({ example: '+44 7700 900123' })
  @IsOptional()
  @IsString()
  @Matches(/^[+()\d][\d\s()+-]{5,19}$/, { message: 'ownerPhone must be a valid phone number' })
  ownerPhone?: string;
}
