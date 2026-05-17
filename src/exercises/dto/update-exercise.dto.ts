import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateExerciseDto {
  @ApiPropertyOptional({ example: 'Supino Inclinado' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Peito' })
  @IsOptional()
  @IsString()
  muscleGroup?: string;

  @ApiPropertyOptional({ example: 'Halteres' })
  @IsOptional()
  @IsString()
  equipment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
