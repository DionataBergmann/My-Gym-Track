import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class LogSetDto {
  @ApiProperty({ example: 1, description: 'Número da série' })
  @IsNumber()
  @Min(1)
  setNumber!: number;

  @ApiProperty({ example: 80, description: 'Carga em kg' })
  @IsNumber()
  @Min(0)
  weightKg!: number;

  @ApiProperty({ example: 10, description: 'Repetições realizadas' })
  @IsNumber()
  @Min(1)
  reps!: number;

  @ApiPropertyOptional({ example: 90, description: 'Descanso em segundos' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  restSeconds?: number;

  @ApiPropertyOptional({ example: 'Consegui uma rep extra' })
  @IsOptional()
  @IsString()
  notes?: string;
}
