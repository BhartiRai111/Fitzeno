import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { AnnouncementAudience, NotificationPriority } from '../../generated/prisma/enums.js';

export class CreateAnnouncementDto {
  @ApiProperty({ example: 'Front desk closing early Friday' })
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  title!: string;

  @ApiProperty({ example: "We'll be closing early at 6pm this Friday for maintenance." })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message!: string;

  @ApiPropertyOptional({ enum: NotificationPriority, default: NotificationPriority.MEDIUM })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @ApiProperty({ enum: AnnouncementAudience })
  @IsEnum(AnnouncementAudience)
  audience!: AnnouncementAudience;

  @ApiPropertyOptional({ description: 'Required when audience = PLAN_MEMBERS.' })
  @ValidateIf((dto: CreateAnnouncementDto) => dto.audience === AnnouncementAudience.PLAN_MEMBERS)
  @IsUUID()
  planId?: string;

  @ApiPropertyOptional({ description: 'Required when audience = SPECIFIC_MEMBERS.', type: [String] })
  @ValidateIf((dto: CreateAnnouncementDto) => dto.audience === AnnouncementAudience.SPECIFIC_MEMBERS)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @IsUUID(undefined, { each: true })
  memberIds?: string[];
}
