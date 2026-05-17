import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AddExerciseDto {
  @ApiProperty({ example: 'clhz1abc...' })
  @IsString()
  exerciseId!: string;

  @ApiProperty({ example: 1, description: 'Posição na ordem do treino' })
  @IsNumber()
  @Min(1)
  orderIndex!: number;

  @ApiPropertyOptional({ example: 'Pausa de 2s no peito' })
  @IsOptional()
  @IsString()
  notes?: string;
}
