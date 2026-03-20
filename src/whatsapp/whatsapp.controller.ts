import {
  Body,
  Controller,
  Header,
  HttpException,
  Logger,
  Post,
} from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';

type TwilioWebhookBody = {
  From?: string;
  Body?: string;
};

@Controller('webhooks/whatsapp')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(private readonly whatsappService: WhatsappService) {}

  private normalizeTwilioPhone(from?: string) {
    if (!from) {
      return '';
    }
    return from.replace('whatsapp:', '').replace(/\D/g, '');
  }

  private buildTwimlMessage(message: string) {
    const escaped = message
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
    return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`;
  }

  @Post()
  @Header('Content-Type', 'text/xml')
  async receiveTwilioMessage(@Body() body: TwilioWebhookBody) {
    const fromPhone = this.normalizeTwilioPhone(body.From);
    const messageText = body.Body?.trim();
    if (!fromPhone || !messageText) {
      return this.buildTwimlMessage('Invalid payload from Twilio.');
    }

    try {
      const response = await this.whatsappService.processIncomingText(
        fromPhone,
        messageText,
      );
      return this.buildTwimlMessage(response);
    } catch (error) {
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error('Error processing Twilio inbound message', stack);
      if (error instanceof HttpException) {
        const response = error.getResponse();
        if (typeof response === 'string') {
          return this.buildTwimlMessage(response);
        }
        if (
          response &&
          typeof response === 'object' &&
          'message' in response &&
          typeof response.message === 'string'
        ) {
          return this.buildTwimlMessage(response.message);
        }
      }
      return this.buildTwimlMessage(
        'Something went wrong while processing your workout message.',
      );
    }
  }
}
