import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class CreateTrainerDto {
  @ApiProperty({ description: 'Must reference a User with role = TRAINER in this gym, with no existing Trainer profile.' })
  @IsUUID()
  userId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @ApiPropertyOptional({ type: [String], example: ['Powerlifting', 'Strength & Conditioning'] })
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

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  offersPersonalTraining?: boolean;
}
