import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { TrainerStatus } from '../../generated/prisma/enums.js';

export class UpdateTrainerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  specialties?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  certifications?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(80)
  yearsExperience?: number;

  @ApiPropertyOptional({ enum: TrainerStatus })
  @IsOptional()
  @IsEnum(TrainerStatus)
  status?: TrainerStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  offersPersonalTraining?: boolean;
}
