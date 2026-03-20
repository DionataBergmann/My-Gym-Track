import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkoutPlanDto } from './dto/create-workout-plan.dto';
import { LogSetDto } from './dto/log-set.dto';
import { StartSessionDto } from './dto/start-session.dto';

@Injectable()
export class WorkoutService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOrCreateUserByPhone(phone: string) {
    return this.prisma.user.upsert({
      where: { phone },
      update: {},
      create: { phone },
    });
  }

  async startSession(dto: StartSessionDto) {
    const user = await this.getOrCreateUserByPhone(dto.userPhone);
    const muscleGroup = dto.muscleGroup.toLowerCase().trim();

    const plan = await this.prisma.workoutPlan.findFirst({
      where: {
        userId: user.id,
        muscleGroup,
      },
      include: {
        exercises: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException(
        `No workout plan found for muscle group "${muscleGroup}".`,
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

  async createPlan(dto: CreateWorkoutPlanDto) {
    const user = await this.getOrCreateUserByPhone(dto.userPhone);
    return this.prisma.workoutPlan.create({
      data: {
        userId: user.id,
        name: dto.name,
        muscleGroup: dto.muscleGroup.toLowerCase().trim(),
        exercises: {
          create: dto.exercises
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((exercise) => ({
              exerciseName: exercise.exerciseName,
              orderIndex: exercise.orderIndex,
              targetSets: exercise.targetSets,
              targetReps: exercise.targetReps,
              restSeconds: exercise.restSeconds,
            })),
        },
      },
      include: {
        exercises: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });
  }

  async listPlansByPhone(userPhone: string) {
    const user = await this.getOrCreateUserByPhone(userPhone);
    return this.prisma.workoutPlan.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        exercises: { orderBy: { orderIndex: 'asc' } },
      },
    });
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

  async getActiveSessionByPhone(userPhone: string) {
    const user = await this.getOrCreateUserByPhone(userPhone);
    return this.prisma.workoutSession.findFirst({
      where: {
        userId: user.id,
        status: 'ACTIVE',
      },
      orderBy: { startedAt: 'desc' },
      include: {
        exercises: {
          orderBy: { orderIndex: 'asc' },
          include: {
            sets: { orderBy: { setNumber: 'asc' } },
          },
        },
      },
    });
  }

  async getNextExercise(userPhone: string) {
    const session = await this.getActiveSessionByPhone(userPhone);
    if (!session) {
      throw new NotFoundException(
        'No active workout session. Start one with: start chest',
      );
    }

    const sessionExercises = session.exercises;
    const nextExercise = sessionExercises.find(
      (exercise: (typeof sessionExercises)[number]) =>
        exercise.sets.length < exercise.targetSets,
    );
    if (!nextExercise) {
      return { session, nextExercise: null };
    }

    const nextSetNumber = nextExercise.sets.length + 1;
    return { session, nextExercise, nextSetNumber };
  }

  async logSetByPhone(userPhone: string, weightKg: number, reps: number) {
    const next = await this.getNextExercise(userPhone);
    if (!next.nextExercise || !next.nextSetNumber) {
      throw new NotFoundException(
        'All exercises are already complete. Use finish to close the session.',
      );
    }

    const set = await this.logSet({
      sessionExerciseId: next.nextExercise.id,
      setNumber: next.nextSetNumber,
      weightKg,
      reps,
      restSeconds: next.nextExercise.restSeconds,
    });

    return { set, next };
  }

  async finishActiveSessionByPhone(userPhone: string) {
    const session = await this.getActiveSessionByPhone(userPhone);
    if (!session) {
      throw new NotFoundException('No active workout session to finish.');
    }
    return this.finishSession(session.id);
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
