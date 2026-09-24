import { ApiProperty } from '@nestjs/swagger';
import { NotificationCategory } from '../../generated/prisma/enums.js';

export class NotificationPreferenceResponseDto {
  @ApiProperty({ enum: NotificationCategory }) category!: NotificationCategory;
  @ApiProperty() enabled!: boolean;
  @ApiProperty({ description: 'false for a category this role can never disable (see the notifications module\'s own rules constant).' }) toggleable!: boolean;
}
