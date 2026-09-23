import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '../password.service.js';

export class ResetPasswordDto {
  @ApiProperty({ description: 'The opaque token from the reset/invite link.' })
  @IsString()
  @MinLength(1)
  token!: string;

  @ApiProperty({ minLength: MIN_PASSWORD_LENGTH, maxLength: MAX_PASSWORD_LENGTH })
  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH, { message: `newPassword must be at least ${MIN_PASSWORD_LENGTH} characters` })
  @MaxLength(MAX_PASSWORD_LENGTH)
  newPassword!: string;
}
