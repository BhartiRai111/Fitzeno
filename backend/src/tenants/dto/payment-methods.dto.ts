import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class PaymentMethodsDto {
  @ApiProperty() @IsBoolean() card!: boolean;
  @ApiProperty() @IsBoolean() upi!: boolean;
  @ApiProperty() @IsBoolean() cash!: boolean;
  @ApiProperty() @IsBoolean() bankTransfer!: boolean;
}
