import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEnum, ValidateNested } from 'class-validator';
import { NotificationCategory } from '../../generated/prisma/enums.js';

class NotificationPreferenceUpdateItemDto {
  @ApiProperty({ enum: NotificationCategory })
  @IsEnum(NotificationCategory)
  category!: NotificationCategory;

  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;
}

/** A batch update — the Settings-page pattern of toggling several switches and saving once, rather than one round-trip per switch. */
export class UpdateNotificationPreferencesDto {
  @ApiProperty({ type: [NotificationPreferenceUpdateItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => NotificationPreferenceUpdateItemDto)
  preferences!: NotificationPreferenceUpdateItemDto[];
}
