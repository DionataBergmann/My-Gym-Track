import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateWorkoutDto {
  @ApiProperty({ example: 'Treino A - Peito e Tríceps' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: '2024-01-15T08:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ example: 'Focou em carga no supino hoje' })
  @IsOptional()
  @IsString()
  notes?: string;
}
