import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationCategory, NotificationPriority } from '../../generated/prisma/enums.js';
import type { Notification } from '../../generated/prisma/client.js';

export class NotificationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: NotificationCategory }) category!: NotificationCategory;
  @ApiProperty({ enum: NotificationPriority }) priority!: NotificationPriority;
  @ApiProperty() title!: string;
  @ApiProperty() message!: string;
  @ApiPropertyOptional({ nullable: true }) relatedEntityType!: string | null;
  @ApiPropertyOptional({ nullable: true }) relatedEntityId!: string | null;
  @ApiPropertyOptional({ nullable: true, description: 'A gym-app-relative deep link, e.g. "/portal/bookings".' }) actionUrl!: string | null;
  @ApiProperty() read!: boolean;
  @ApiPropertyOptional({ nullable: true }) readAt!: Date | null;
  @ApiProperty() createdAt!: Date;
}

export function toNotificationResponse(notification: Notification): NotificationResponseDto {
  return {
    id: notification.id,
    category: notification.category,
    priority: notification.priority,
    title: notification.title,
    message: notification.message,
    relatedEntityType: notification.relatedEntityType,
    relatedEntityId: notification.relatedEntityId,
    actionUrl: notification.actionUrl,
    read: notification.readAt !== null,
    readAt: notification.readAt,
    createdAt: notification.createdAt,
  };
}
