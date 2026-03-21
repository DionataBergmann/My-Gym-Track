import { Injectable, NotFoundException } from '@nestjs/common';
import {
  legacyBrazilMobileWithoutNine,
  normalizeBrazilPhoneDigits,
} from '../common/phone.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkoutPlanDto } from './dto/create-workout-plan.dto';
import { LogSetDto } from './dto/log-set.dto';
import { StartSessionDto } from './dto/start-session.dto';

@Injectable()
export class WorkoutService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOrCreateUserByPhone(phone: string) {
    const normalized = normalizeBrazilPhoneDigits(phone.replace(/\D/g, ''));
    const legacy = legacyBrazilMobileWithoutNine(normalized);

    const matches = await this.prisma.user.findMany({
      where: {
        OR: [
          { phone: normalized },
          ...(legacy ? [{ phone: legacy }] : []),
        ],
      },
      include: {
        plans: { select: { id: true } },
      },
    });

    if (matches.length === 0) {
      return this.prisma.user.create({ data: { phone: normalized } });
    }

    if (matches.length === 1) {
      const u = matches[0];
      if (u.phone !== normalized) {
        return this.prisma.user.update({
          where: { id: u.id },
          data: { phone: normalized },
        });
      }
      return u;
    }

    // Twilio legacy + canonical created duplicate rows — merge into one user (prefer one with plans).
    const sorted = [...matches].sort(
      (a, b) => b.plans.length - a.plans.length,
    );
    const primary = sorted[0];

    for (const other of sorted.slice(1)) {
      await this.prisma.workoutPlan.updateMany({
        where: { userId: other.id },
        data: { userId: primary.id },
      });
      await this.prisma.workoutSession.updateMany({
        where: { userId: other.id },
        data: { userId: primary.id },
      });
      await this.prisma.user.delete({ where: { id: other.id } });
    }

    const updated =
      primary.phone !== normalized
        ? await this.prisma.user.update({
            where: { id: primary.id },
            data: { phone: normalized },
          })
        : primary;

    return this.prisma.user.findUniqueOrThrow({ where: { id: updated.id } });
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
        `No workout plan for "${muscleGroup}" on YOUR number. Send "phone" to see your id, put it in SEED_USER_PHONE, run npm run seed (on the same machine as this API — e.g. Render Shell if deployed).`,
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
        'No active workout session. Start with: start upper-a (or chest, upper-b, lower-a, lower-b)',
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
    const pending = await this.getNextExercise(userPhone);
    if (!pending.nextExercise || !pending.nextSetNumber) {
      throw new NotFoundException(
        'All exercises are already complete. Use finish to close the session.',
      );
    }

    const set = await this.logSet({
      sessionExerciseId: pending.nextExercise.id,
      setNumber: pending.nextSetNumber,
      weightKg,
      reps,
      restSeconds: pending.nextExercise.restSeconds,
    });

    // Re-fetch so callers see the *next* pending set (not the one just logged).
    const next = await this.getNextExercise(userPhone);
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
