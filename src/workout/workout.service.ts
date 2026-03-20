import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LogSetDto } from './dto/log-set.dto';
import { StartSessionDto } from './dto/start-session.dto';

@Injectable()
export class WorkoutService {
  constructor(private readonly prisma: PrismaService) {}

  async startSession(dto: StartSessionDto) {
    const user = await this.prisma.user.upsert({
      where: { phone: dto.userPhone },
      update: {},
      create: { phone: dto.userPhone },
    });

    const plan = await this.prisma.workoutPlan.findFirst({
      where: {
        userId: user.id,
        muscleGroup: dto.muscleGroup,
      },
      include: {
        exercises: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException(
        `No workout plan found for muscle group "${dto.muscleGroup}".`,
      );
    }
    const planExercises = plan.exercises;

    const session = await this.prisma.workoutSession.create({
      data: {
        userId: user.id,
        workoutPlanId: plan.id,
        status: 'ACTIVE',
        exercises: {
          create: planExercises.map((exercise: (typeof planExercises)[number]) => ({
            exerciseName: exercise.exerciseName,
            orderIndex: exercise.orderIndex,
            targetSets: exercise.targetSets,
            targetReps: exercise.targetReps,
            restSeconds: exercise.restSeconds,
          })),
        },
      },
      include: {
        exercises: { orderBy: { orderIndex: 'asc' } },
      },
    });

    return session;
  }

  async getSession(sessionId: string) {
    return this.prisma.workoutSession.findUnique({
      where: { id: sessionId },
      include: {
        exercises: {
          orderBy: { orderIndex: 'asc' },
          include: {
            sets: {
              orderBy: { setNumber: 'asc' },
            },
          },
        },
      },
    });
  }

  async logSet(dto: LogSetDto) {
    const sessionExercise = await this.prisma.sessionExercise.findUnique({
      where: { id: dto.sessionExerciseId },
    });
    if (!sessionExercise) {
      throw new NotFoundException('Session exercise not found.');
    }

    return this.prisma.sessionSet.create({
      data: {
        sessionExerciseId: dto.sessionExerciseId,
        setNumber: dto.setNumber,
        weightKg: dto.weightKg,
        reps: dto.reps,
        restSeconds: dto.restSeconds,
      },
    });
  }

  async finishSession(sessionId: string) {
    return this.prisma.workoutSession.update({
      where: { id: sessionId },
      data: {
        status: 'DONE',
        finishedAt: new Date(),
      },
    });
  }
}
