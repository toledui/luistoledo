import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@Controller('settings')
export class PublicSettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('public')
  @ApiOperation({ summary: 'Configuración pública de la academia' })
  getPublic() {
    return this.settings.getPublic();
  }

  @Get('branding')
  @ApiOperation({ summary: 'Branding público' })
  getBranding() {
    return this.settings.getBranding();
  }
}
