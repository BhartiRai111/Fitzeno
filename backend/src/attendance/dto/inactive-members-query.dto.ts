import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class InactiveMembersQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 14, description: 'No check-in within this many days.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  days: number = 14;
}
