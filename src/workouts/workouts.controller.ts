import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddExerciseDto } from './dto/add-exercise.dto';
import { CreateWorkoutDto } from './dto/create-workout.dto';
import { LogSetDto } from './dto/log-set.dto';
import { UpdateSetDto } from './dto/update-set.dto';
import { UpdateWorkoutDto } from './dto/update-workout.dto';
import { WorkoutsService } from './workouts.service';

@ApiTags('workouts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workouts')
export class WorkoutsController {
  constructor(private readonly workoutsService: WorkoutsService) {}

  // ─── Workouts ────────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Iniciar um novo treino' })
  create(@CurrentUser() user: User, @Body() dto: CreateWorkoutDto) {
    return this.workoutsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Histórico de treinos' })
  findAll(@CurrentUser() user: User) {
    return this.workoutsService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar treino com todos os exercícios e séries' })
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.workoutsService.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar dados do treino' })
  update(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateWorkoutDto) {
    return this.workoutsService.update(user.id, id, dto);
  }

  @Post(':id/finish')
  @ApiOperation({ summary: 'Encerrar treino' })
  finish(@CurrentUser() user: User, @Param('id') id: string) {
    return this.workoutsService.finish(user.id, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletar treino' })
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.workoutsService.remove(user.id, id);
  }

  // ─── Exercises inside a Workout ───────────────────────────────────────────────

  @Post(':id/exercises')
  @ApiOperation({ summary: 'Adicionar exercício ao treino' })
  addExercise(
    @CurrentUser() user: User,
    @Param('id') workoutId: string,
    @Body() dto: AddExerciseDto,
  ) {
    return this.workoutsService.addExercise(user.id, workoutId, dto);
  }

  @Delete(':id/exercises/:workoutExerciseId')
  @ApiOperation({ summary: 'Remover exercício do treino' })
  removeExercise(
    @CurrentUser() user: User,
    @Param('id') workoutId: string,
    @Param('workoutExerciseId') workoutExerciseId: string,
  ) {
    return this.workoutsService.removeExercise(user.id, workoutId, workoutExerciseId);
  }

  // ─── Sets ─────────────────────────────────────────────────────────────────────

  @Post(':id/exercises/:workoutExerciseId/sets')
  @ApiOperation({ summary: 'Registrar série (carga + reps)' })
  logSet(
    @CurrentUser() user: User,
    @Param('id') workoutId: string,
    @Param('workoutExerciseId') workoutExerciseId: string,
    @Body() dto: LogSetDto,
  ) {
    return this.workoutsService.logSet(user.id, workoutId, workoutExerciseId, dto);
  }

  @Get(':id/exercises/:workoutExerciseId/sets')
  @ApiOperation({ summary: 'Listar séries de um exercício no treino' })
  getSets(
    @CurrentUser() user: User,
    @Param('id') workoutId: string,
    @Param('workoutExerciseId') workoutExerciseId: string,
  ) {
    return this.workoutsService.getSets(user.id, workoutId, workoutExerciseId);
  }

  @Patch(':id/exercises/:workoutExerciseId/sets/:setId')
  @ApiOperation({ summary: 'Editar uma série registrada' })
  updateSet(
    @CurrentUser() user: User,
    @Param('id') workoutId: string,
    @Param('workoutExerciseId') workoutExerciseId: string,
    @Param('setId') setId: string,
    @Body() dto: UpdateSetDto,
  ) {
    return this.workoutsService.updateSet(user.id, workoutId, workoutExerciseId, setId, dto);
  }

  @Delete(':id/exercises/:workoutExerciseId/sets/:setId')
  @ApiOperation({ summary: 'Deletar uma série registrada' })
  removeSet(
    @CurrentUser() user: User,
    @Param('id') workoutId: string,
    @Param('workoutExerciseId') workoutExerciseId: string,
    @Param('setId') setId: string,
  ) {
    return this.workoutsService.removeSet(user.id, workoutId, workoutExerciseId, setId);
  }
}
