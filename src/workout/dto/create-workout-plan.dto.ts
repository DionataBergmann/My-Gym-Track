import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

class CreateWorkoutExerciseDto {
  @IsString()
  @IsNotEmpty()
  exerciseName!: string;

  @IsInt()
  @Min(1)
  orderIndex!: number;

  @IsInt()
  @Min(1)
  targetSets!: number;

  @IsInt()
  @Min(1)
  targetReps!: number;

  @IsInt()
  @Min(0)
  restSeconds!: number;
}

export class CreateWorkoutPlanDto {
  @IsString()
  @IsNotEmpty()
  userPhone!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  muscleGroup!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkoutExerciseDto)
  exercises!: CreateWorkoutExerciseDto[];
}
