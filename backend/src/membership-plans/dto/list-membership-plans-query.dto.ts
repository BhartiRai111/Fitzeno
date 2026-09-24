import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { PlanStatus } from '../../generated/prisma/enums.js';

export class ListMembershipPlansQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PlanStatus, description: 'Defaults to ACTIVE-only for non-managers browsing available plans — pass explicitly to see archived ones too.' })
  @IsOptional()
  @IsEnum(PlanStatus)
  status?: PlanStatus;
}
