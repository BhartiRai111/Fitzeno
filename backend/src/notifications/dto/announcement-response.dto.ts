import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AnnouncementAudience, NotificationPriority } from '../../generated/prisma/enums.js';
import type { Announcement } from '../../generated/prisma/client.js';

class AnnouncementSenderDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
}

export class AnnouncementResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() message!: string;
  @ApiProperty({ enum: NotificationPriority }) priority!: NotificationPriority;
  @ApiProperty({ enum: AnnouncementAudience }) audience!: AnnouncementAudience;
  @ApiPropertyOptional({ nullable: true }) audiencePlanId!: string | null;
  @ApiProperty() recipientCount!: number;
  @ApiProperty({ type: AnnouncementSenderDto }) sentBy!: AnnouncementSenderDto;
  @ApiProperty() createdAt!: Date;
}

export type AnnouncementWithRelations = Announcement & {
  sentBy: { id: string; firstName: string; lastName: string };
};

export function toAnnouncementResponse(announcement: AnnouncementWithRelations): AnnouncementResponseDto {
  return {
    id: announcement.id,
    title: announcement.title,
    message: announcement.message,
    priority: announcement.priority,
    audience: announcement.audience,
    audiencePlanId: announcement.audiencePlanId,
    recipientCount: announcement.recipientCount,
    sentBy: announcement.sentBy,
    createdAt: announcement.createdAt,
  };
}
