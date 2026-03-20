import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  getHealth() {
    return {
      ok: true,
      service: 'my-gym-track-api',
      timestamp: new Date().toISOString(),
    };
  }
}
