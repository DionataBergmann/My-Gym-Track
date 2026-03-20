import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsappService } from './whatsapp.service';

type WhatsappWebhookBody = {
  from?: string;
  text?: string;
};

@Controller('webhooks/whatsapp')
export class WhatsappController {
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
    if (!body.from || !body.text) {
      return { ok: true, ignored: true };
    }

    const response = await this.whatsappService.processIncomingText(
      body.from,
      body.text,
    );
    return { ok: true, response };
  }
}
