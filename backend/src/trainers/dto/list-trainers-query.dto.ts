import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { TrainerStatus } from '../../generated/prisma/enums.js';

export class ListTrainersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: TrainerStatus })
  @IsOptional()
  @IsEnum(TrainerStatus)
  status?: TrainerStatus;

  @ApiPropertyOptional({ description: 'Only trainers bookable for Personal Training.' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  offersPersonalTraining?: boolean;
}
