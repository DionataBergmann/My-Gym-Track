import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { WhatsappService } from './whatsapp.service';

@Injectable()
export class RestPingScheduler {
  private readonly logger = new Logger(RestPingScheduler.name);

  constructor(private readonly whatsappService: WhatsappService) {}

  /** Poll DB for due rest pings (works after restarts; complements Twilio outbound). */
  @Interval(5_000)
  flushDueRestPingsTick() {
    void this.whatsappService.flushDueRestPings().catch((err) => {
      this.logger.error(
        'flushDueRestPings failed',
        err instanceof Error ? err.stack : err,
      );
    });
  }
}
