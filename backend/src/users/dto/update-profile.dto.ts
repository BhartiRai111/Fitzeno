import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
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

  @ApiPropertyOptional({ description: 'E.164-ish phone number, e.g. +44 7700 900123' })
  @IsOptional()
  @IsString()
  @Matches(/^[+()\d][\d\s()+-]{5,19}$/, { message: 'phone must be a valid phone number' })
  phone?: string;
}
