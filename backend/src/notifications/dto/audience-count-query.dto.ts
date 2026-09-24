import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID, ValidateIf } from 'class-validator';
import { AnnouncementAudience } from '../../generated/prisma/enums.js';

/** A live "~N recipients will receive this" preview, matching the approved frontend's SendNotificationDialog UX — computed with the exact same resolver AnnouncementsService.send() uses, so the preview and the real send can never disagree. */
export class AudienceCountQueryDto {
  @ApiProperty({ enum: AnnouncementAudience })
  @IsEnum(AnnouncementAudience)
  audience!: AnnouncementAudience;

  @ApiPropertyOptional({ description: 'Required when audience = PLAN_MEMBERS.' })
  @ValidateIf((dto: AudienceCountQueryDto) => dto.audience === AnnouncementAudience.PLAN_MEMBERS)
  @IsUUID()
  planId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  memberIds?: string[];
}
