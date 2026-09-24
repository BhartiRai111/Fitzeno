import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { ClassBookingStatus } from '../../generated/prisma/enums.js';

export class ListClassBookingsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  classOccurrenceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  memberId?: string;

  @ApiPropertyOptional({ enum: ClassBookingStatus })
  @IsOptional()
  @IsEnum(ClassBookingStatus)
  status?: ClassBookingStatus;
}
