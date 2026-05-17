import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddExerciseDto } from './dto/add-exercise.dto';
import { CreateWorkoutDto } from './dto/create-workout.dto';
import { LogSetDto } from './dto/log-set.dto';
import { UpdateSetDto } from './dto/update-set.dto';
import { UpdateWorkoutDto } from './dto/update-workout.dto';

@Injectable()
export class WorkoutsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Workouts ────────────────────────────────────────────────────────────────

  create(userId: string, dto: CreateWorkoutDto) {
    return this.prisma.workout.create({
      data: {
        userId,
        name: dto.name,
        notes: dto.notes,
        date: dto.date ? new Date(dto.date) : undefined,
      },
    });
  }

  findAll(userId: string) {
    return this.prisma.workout.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      include: {
        exercises: {
          orderBy: { orderIndex: 'asc' },
          include: { exercise: true },
        },
      },
    });
  }

  async findOne(userId: string, id: string) {
    const workout = await this.prisma.workout.findUnique({
      where: { id },
      include: {
        exercises: {
          orderBy: { orderIndex: 'asc' },
          include: {
            exercise: true,
            sets: { orderBy: { setNumber: 'asc' } },
          },
        },
      },
    });
    if (!workout) throw new NotFoundException('Treino não encontrado.');
    if (workout.userId !== userId) throw new ForbiddenException();
    return workout;
  }

  async update(userId: string, id: string, dto: UpdateWorkoutDto) {
    await this.findOne(userId, id);
    return this.prisma.workout.update({
      where: { id },
      data: {
        ...dto,
        date: dto.date ? new Date(dto.date) : undefined,
      },
    });
  }

  async finish(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.prisma.workout.update({
      where: { id },
      data: { status: 'DONE', finishedAt: new Date() },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.prisma.workout.delete({ where: { id } });
  }

  // ─── Workout Exercises ────────────────────────────────────────────────────────

  async addExercise(userId: string, workoutId: string, dto: AddExerciseDto) {
    await this.findOne(userId, workoutId);
    return this.prisma.workoutExercise.create({
      data: {
        workoutId,
        exerciseId: dto.exerciseId,
        orderIndex: dto.orderIndex,
        notes: dto.notes,
      },
      include: { exercise: true },
    });
  }

  async removeExercise(userId: string, workoutId: string, workoutExerciseId: string) {
    await this.findOne(userId, workoutId);
    const we = await this.prisma.workoutExercise.findUnique({
      where: { id: workoutExerciseId },
    });
    if (!we || we.workoutId !== workoutId) throw new NotFoundException('Exercício não encontrado neste treino.');
    return this.prisma.workoutExercise.delete({ where: { id: workoutExerciseId } });
  }

  // ─── Sets ─────────────────────────────────────────────────────────────────────

  async logSet(userId: string, workoutId: string, workoutExerciseId: string, dto: LogSetDto) {
    await this.findOne(userId, workoutId);
    const we = await this.prisma.workoutExercise.findUnique({
      where: { id: workoutExerciseId },
    });
    if (!we || we.workoutId !== workoutId) throw new NotFoundException('Exercício não encontrado neste treino.');

    return this.prisma.set.create({
      data: {
        workoutExerciseId,
        setNumber: dto.setNumber,
        weightKg: dto.weightKg,
        reps: dto.reps,
        restSeconds: dto.restSeconds,
        notes: dto.notes,
      },
    });
  }

  async getSets(userId: string, workoutId: string, workoutExerciseId: string) {
    await this.findOne(userId, workoutId);
    return this.prisma.set.findMany({
      where: { workoutExerciseId },
      orderBy: { setNumber: 'asc' },
    });
  }

  async updateSet(
    userId: string,
    workoutId: string,
    workoutExerciseId: string,
    setId: string,
    dto: UpdateSetDto,
  ) {
    await this.findOne(userId, workoutId);
    const set = await this.prisma.set.findUnique({ where: { id: setId } });
    if (!set || set.workoutExerciseId !== workoutExerciseId) {
      throw new NotFoundException('Série não encontrada.');
    }
    return this.prisma.set.update({ where: { id: setId }, data: dto });
  }

  async removeSet(userId: string, workoutId: string, workoutExerciseId: string, setId: string) {
    await this.findOne(userId, workoutId);
    const set = await this.prisma.set.findUnique({ where: { id: setId } });
    if (!set || set.workoutExerciseId !== workoutExerciseId) {
      throw new NotFoundException('Série não encontrada.');
    }
    return this.prisma.set.delete({ where: { id: setId } });
  }
}
