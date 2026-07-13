import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Estado del servicio' })
  check() {
    return {
      status: 'ok',
      service: 'luistoledo-academy-api',
      timestamp: new Date().toISOString(),
    };
  }
}
