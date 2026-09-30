import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RedeemCheckInTokenDto {
  @ApiProperty({ description: "The raw token from the member's QR code." })
  @IsString()
  @MinLength(16)
  token!: string;
}
