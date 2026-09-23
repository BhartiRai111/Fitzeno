import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { MemberStatus } from '../../generated/prisma/enums.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

export class ListMembersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: MemberStatus })
  @IsOptional()
  @IsEnum(MemberStatus)
  status?: MemberStatus;

  @ApiPropertyOptional({ description: 'Filter to members assigned to this trainer.' })
  @IsOptional()
  @IsUUID()
  trainerId?: string;
}
