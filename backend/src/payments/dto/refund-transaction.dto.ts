import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class RefundTransactionDto {
  @ApiPropertyOptional({ description: 'Omit for a full refund of the remaining refundable amount.', minimum: 0.01 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1000000)
  amount?: number;

  @ApiPropertyOptional({ example: 'Member cancelled within the cooling-off period.' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
