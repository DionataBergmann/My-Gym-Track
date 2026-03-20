import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateWorkoutPlanDto } from './dto/create-workout-plan.dto';
import { LogSetDto } from './dto/log-set.dto';
import { StartSessionDto } from './dto/start-session.dto';
import { WorkoutService } from './workout.service';

@Controller('workouts')
export class WorkoutController {
  constructor(private readonly workoutService: WorkoutService) {}

  @Post('plans')
  createPlan(@Body() dto: CreateWorkoutPlanDto) {
    return this.workoutService.createPlan(dto);
  }

  @Get('plans/:phone')
  listPlans(@Param('phone') phone: string) {
    return this.workoutService.listPlansByPhone(phone);
  }

  @Post('sessions/start')
  startSession(@Body() dto: StartSessionDto) {
    return this.workoutService.startSession(dto);
  }

  @Get('sessions/:id')
  getSession(@Param('id') id: string) {
    return this.workoutService.getSession(id);
  }

  @Post('sessions/log-set')
  logSet(@Body() dto: LogSetDto) {
    return this.workoutService.logSet(dto);
  }

  @Patch('sessions/:id/finish')
  finish(@Param('id') id: string) {
    return this.workoutService.finishSession(id);
  }
}
