import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsEnum, ValidateNested } from 'class-validator';
import { PermissionArea, PermissionLevel } from '../../generated/prisma/enums.js';

class PermissionOverrideEntryDto {
  @ApiProperty({ enum: PermissionArea })
  @IsEnum(PermissionArea)
  area!: PermissionArea;

  @ApiProperty({ enum: PermissionLevel })
  @IsEnum(PermissionLevel)
  level!: PermissionLevel;
}

export class SetPermissionOverridesDto {
  @ApiProperty({
    type: [PermissionOverrideEntryDto],
    description:
      'The full override set for this user — replaces whatever was there before. An empty array clears all overrides, reverting to the role defaults.',
  })
  @IsArray()
  @ArrayMaxSize(11) // one entry per PermissionArea, at most
  @ValidateNested({ each: true })
  @Type(() => PermissionOverrideEntryDto)
  overrides!: PermissionOverrideEntryDto[];
}
