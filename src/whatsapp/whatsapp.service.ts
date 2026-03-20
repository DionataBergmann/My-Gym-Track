import { Injectable } from '@nestjs/common';
import { WorkoutService } from '../workout/workout.service';

@Injectable()
export class WhatsappService {
  constructor(private readonly workoutService: WorkoutService) {}

  async processIncomingText(fromPhone: string, text: string) {
    const normalized = text.trim().toLowerCase();

    if (normalized.startsWith('start ')) {
      const muscleGroup = normalized.replace('start ', '').trim();
      const session = await this.workoutService.startSession({
        userPhone: fromPhone,
        muscleGroup,
      });
      return `Training started: ${muscleGroup}. Session ID: ${session.id}`;
    }

    return 'Command not recognized. Example: "start chest".';
  }
}
