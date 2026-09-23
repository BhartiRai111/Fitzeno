import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class ConvertLeadDto {
  @ApiPropertyOptional({ description: 'Assign a trainer to the new/linked member at conversion time.' })
  @IsOptional()
  @IsUUID()
  trainerId?: string;

  @ApiPropertyOptional({ description: 'Defaults to today. Ignored if converting into an already-existing member.' })
  @IsOptional()
  @IsDateString()
  joinedOn?: string;
}
