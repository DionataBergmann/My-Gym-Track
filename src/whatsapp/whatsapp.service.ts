import { Injectable } from '@nestjs/common';
import { WorkoutService } from '../workout/workout.service';

@Injectable()
export class WhatsappService {
  constructor(private readonly workoutService: WorkoutService) {}

  private helpMessage() {
    return [
      'Commands:',
      '- start <muscle-group>',
      '- next',
      '- log <weight>x<reps>  (example: log 40x10)',
      '- finish',
    ].join('\n');
  }

  private formatNextExerciseResponse(next: Awaited<ReturnType<WorkoutService['getNextExercise']>>) {
    if (!next.nextExercise || !next.nextSetNumber) {
      return 'All exercises completed. Send "finish" to close your session.';
    }

    return [
      `Next: ${next.nextExercise.exerciseName}`,
      `Set ${next.nextSetNumber}/${next.nextExercise.targetSets}`,
      `Target reps: ${next.nextExercise.targetReps}`,
      `Rest: ${next.nextExercise.restSeconds}s`,
    ].join('\n');
  }

  async processIncomingText(fromPhone: string, text: string) {
    const normalized = text.trim().toLowerCase();

    if (!normalized || normalized === 'help') {
      return this.helpMessage();
    }

    if (normalized.startsWith('start ')) {
      const muscleGroup = normalized.replace('start ', '').trim();
      const session = await this.workoutService.startSession({
        userPhone: fromPhone,
        muscleGroup,
      });
      const firstExercise = session.exercises[0];
      if (!firstExercise) {
        return `Training started: ${muscleGroup}. No exercises found in this plan.`;
      }
      return [
        `Training started: ${muscleGroup}`,
        `First exercise: ${firstExercise.exerciseName}`,
        `Set 1/${firstExercise.targetSets} - ${firstExercise.targetReps} reps`,
        `Rest: ${firstExercise.restSeconds}s`,
      ].join('\n');
    }

    if (normalized === 'next') {
      const next = await this.workoutService.getNextExercise(fromPhone);
      return this.formatNextExerciseResponse(next);
    }

    if (normalized === 'finish') {
      await this.workoutService.finishActiveSessionByPhone(fromPhone);
      return 'Session finished. Great work today.';
    }

    if (normalized.startsWith('log ')) {
      const payload = normalized.replace('log ', '').trim();
      const match = payload.match(/^(\d+(?:[.,]\d+)?)x(\d+)$/);
      if (!match) {
        return 'Invalid format. Use: log 40x10';
      }

      const weightKg = Number(match[1].replace(',', '.'));
      const reps = Number(match[2]);
      const result = await this.workoutService.logSetByPhone(fromPhone, weightKg, reps);
      const nextMessage = this.formatNextExerciseResponse(result.next);
      return [`Set logged: ${weightKg}kg x ${reps} reps`, '', nextMessage].join('\n');
    }

    return `Command not recognized.\n\n${this.helpMessage()}`;
  }
}
