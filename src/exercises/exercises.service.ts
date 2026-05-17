import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';

@Injectable()
export class ExercisesService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, dto: CreateExerciseDto) {
    return this.prisma.exercise.create({
      data: { ...dto, userId },
    });
  }

  findAll(userId: string, muscleGroup?: string) {
    return this.prisma.exercise.findMany({
      where: {
        userId,
        ...(muscleGroup ? { muscleGroup: { contains: muscleGroup, mode: 'insensitive' } } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(userId: string, id: string) {
    const exercise = await this.prisma.exercise.findUnique({ where: { id } });
    if (!exercise) throw new NotFoundException('Exercício não encontrado.');
    if (exercise.userId !== userId) throw new ForbiddenException();
    return exercise;
  }

  async update(userId: string, id: string, dto: UpdateExerciseDto) {
    await this.findOne(userId, id);
    return this.prisma.exercise.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.prisma.exercise.delete({ where: { id } });
  }

  async getProgression(userId: string, exerciseId: string) {
    await this.findOne(userId, exerciseId);

    const sets = await this.prisma.set.findMany({
      where: {
        workoutExercise: { exerciseId },
      },
      include: {
        workoutExercise: {
          include: {
            workout: { select: { id: true, name: true, date: true } },
          },
        },
      },
      orderBy: { completedAt: 'asc' },
    });

    const byWorkout = new Map<
      string,
      { workoutId: string; workoutName: string; date: Date; maxWeightKg: number; totalVolume: number }
    >();

    for (const set of sets) {
      const w = set.workoutExercise.workout;
      const existing = byWorkout.get(w.id);
      if (!existing) {
        byWorkout.set(w.id, {
          workoutId: w.id,
          workoutName: w.name,
          date: w.date,
          maxWeightKg: set.weightKg,
          totalVolume: set.weightKg * set.reps,
        });
      } else {
        existing.maxWeightKg = Math.max(existing.maxWeightKg, set.weightKg);
        existing.totalVolume += set.weightKg * set.reps;
      }
    }

    return Array.from(byWorkout.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );
  }
}
