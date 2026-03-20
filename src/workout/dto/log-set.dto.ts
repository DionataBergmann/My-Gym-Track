import { IsInt, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';

export class LogSetDto {
  @IsString()
  sessionExerciseId!: string;

  @IsInt()
  @Min(1)
  setNumber!: number;

  @IsNumber()
  @IsPositive()
  weightKg!: number;

  @IsInt()
  @Min(1)
  reps!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  restSeconds?: number;
}
