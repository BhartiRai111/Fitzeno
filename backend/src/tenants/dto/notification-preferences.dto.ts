import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, ValidateNested } from 'class-validator';

class MemberNotificationChannelsDto {
  @ApiProperty() @IsBoolean() booking!: boolean;
  @ApiProperty() @IsBoolean() renewal!: boolean;
  @ApiProperty() @IsBoolean() payment!: boolean;
  @ApiProperty() @IsBoolean() attendance!: boolean;
  @ApiProperty() @IsBoolean() announcement!: boolean;
  @ApiProperty() @IsBoolean() promotion!: boolean;
}

class StaffNotificationChannelsDto {
  @ApiProperty() @IsBoolean() booking!: boolean;
  @ApiProperty() @IsBoolean() class!: boolean;
  @ApiProperty() @IsBoolean() attendance!: boolean;
  @ApiProperty() @IsBoolean() announcement!: boolean;
}

export class NotificationPreferencesDto {
  @ApiProperty({ type: MemberNotificationChannelsDto })
  @ValidateNested()
  @Type(() => MemberNotificationChannelsDto)
  member!: MemberNotificationChannelsDto;

  @ApiProperty({ type: StaffNotificationChannelsDto })
  @ValidateNested()
  @Type(() => StaffNotificationChannelsDto)
  staff!: StaffNotificationChannelsDto;
}
