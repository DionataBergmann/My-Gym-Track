import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';
import { ExercisesService } from './exercises.service';

@ApiTags('exercises')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('exercises')
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastrar exercício no catálogo' })
  create(@CurrentUser() user: User, @Body() dto: CreateExerciseDto) {
    return this.exercisesService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar exercícios do usuário' })
  @ApiQuery({ name: 'muscleGroup', required: false })
  findAll(@CurrentUser() user: User, @Query('muscleGroup') muscleGroup?: string) {
    return this.exercisesService.findAll(user.id, muscleGroup);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar exercício por ID' })
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.exercisesService.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar exercício' })
  update(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateExerciseDto) {
    return this.exercisesService.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover exercício do catálogo' })
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.exercisesService.remove(user.id, id);
  }

  @Get(':id/progression')
  @ApiOperation({ summary: 'Progressão de carga por exercício ao longo do tempo' })
  getProgression(@CurrentUser() user: User, @Param('id') id: string) {
    return this.exercisesService.getProgression(user.id, id);
  }
}
