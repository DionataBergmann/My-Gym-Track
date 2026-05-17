import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateExerciseDto {
  @ApiProperty({ example: 'Supino Reto' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'Peito', description: 'Grupo muscular principal' })
  @IsString()
  muscleGroup!: string;

  @ApiPropertyOptional({ example: 'Barra', description: 'Equipamento utilizado' })
  @IsOptional()
  @IsString()
  equipment?: string;

  @ApiPropertyOptional({ example: 'Cotovelos a 45 graus' })
  @IsOptional()
  @IsString()
  notes?: string;
}
