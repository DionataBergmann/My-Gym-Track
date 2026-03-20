import { IsNotEmpty, IsString } from 'class-validator';

export class StartSessionDto {
  @IsString()
  @IsNotEmpty()
  userPhone!: string;

  @IsString()
  @IsNotEmpty()
  muscleGroup!: string;
}
