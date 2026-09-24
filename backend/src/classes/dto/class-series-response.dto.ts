import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClassSeriesStatus, DayOfWeek } from '../../generated/prisma/enums.js';
import type { ClassSeries } from '../../generated/prisma/client.js';

class SeriesTrainerSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
}

export class ClassSeriesResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() category!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiProperty({ type: SeriesTrainerSummaryDto }) trainer!: SeriesTrainerSummaryDto;
  @ApiProperty({ enum: DayOfWeek }) dayOfWeek!: DayOfWeek;
  @ApiProperty() startTime!: string;
  @ApiProperty() durationMinutes!: number;
  @ApiProperty() capacity!: number;
  @ApiProperty() location!: string;
  @ApiProperty({ enum: ClassSeriesStatus }) status!: ClassSeriesStatus;
  @ApiProperty() startDate!: Date;
  @ApiPropertyOptional({ nullable: true }) endDate!: Date | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export type ClassSeriesWithRelations = ClassSeries & {
  trainer: { id: string; firstName: string; lastName: string };
};

export function toClassSeriesResponse(series: ClassSeriesWithRelations): ClassSeriesResponseDto {
  return {
    id: series.id,
    tenantId: series.tenantId,
    name: series.name,
    category: series.category,
    description: series.description,
    trainer: series.trainer,
    dayOfWeek: series.dayOfWeek,
    startTime: series.startTime,
    durationMinutes: series.durationMinutes,
    capacity: series.capacity,
    location: series.location,
    status: series.status,
    startDate: series.startDate,
    endDate: series.endDate,
    createdAt: series.createdAt,
    updatedAt: series.updatedAt,
  };
}
