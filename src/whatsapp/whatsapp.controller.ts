import { Body, Controller, Get, Logger, Post, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsappService } from './whatsapp.service';

type WhatsappMessage = {
  from?: string;
  text?: {
    body?: string;
  };
  type?: string;
};

type WhatsappWebhookBody = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: WhatsappMessage[];
      };
    }>;
  }>;
};

@Controller('webhooks/whatsapp')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly whatsappService: WhatsappService,
  ) {}

  @Get()
  verify(
    @Query('hub.mode') mode?: string,
    @Query('hub.verify_token') token?: string,
    @Query('hub.challenge') challenge?: string,
  ) {
    const verifyToken = this.configService.get<string>('WHATSAPP_VERIFY_TOKEN');
    if (mode === 'subscribe' && token && token === verifyToken) {
      return challenge ?? '';
    }
    return 'invalid verify token';
  }

  @Post()
  async receiveMessage(@Body() body: WhatsappWebhookBody) {
    const firstEntry = body.entry?.[0];
    const firstChange = firstEntry?.changes?.[0];
    const firstMessage = firstChange?.value?.messages?.[0];

    if (!firstMessage || firstMessage.type !== 'text') {
      return { ok: true, ignored: true, reason: 'non-text-or-empty' };
    }

    const fromPhone = firstMessage.from;
    const messageText = firstMessage.text?.body?.trim();
    if (!fromPhone || !messageText) {
      return { ok: true, ignored: true, reason: 'missing-from-or-text' };
    }

    try {
      const response = await this.whatsappService.replyToIncomingText(
        fromPhone,
        messageText,
      );
      return { ok: true, response };
    } catch (error) {
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error('Error processing WhatsApp inbound message', stack);
      return { ok: false };
    }
  }
}
