import {
  Body,
  Controller,
  Get,
  Ip,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { AuthGuard } from '../auth/auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { TestEmailDto } from './dto/test-email.dto';
import { UpdateEmailSettingsDto } from './dto/update-email-settings.dto';
import { EmailService } from './email.service';

@ApiTags('admin email')
@Controller('admin/email')
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermissions('settings.manage')
export class EmailController {
  constructor(private readonly email: EmailService) {}
  @Get('settings')
  @ApiOperation({ summary: 'Configuración segura de correo' })
  settings() {
    return this.email.getSettings();
  }
  @Patch('settings')
  @ApiOperation({ summary: 'Actualizar proveedor de correo' })
  update(
    @Body() dto: UpdateEmailSettingsDto,
    @Req() request: AuthenticatedRequest,
    @Ip() ipAddress: string,
  ) {
    return this.email.updateSettings(
      dto,
      { id: request.auth.sub, email: request.auth.email },
      ipAddress,
    );
  }
  @Post('test') @ApiOperation({ summary: 'Enviar correo de prueba' }) test(
    @Body() dto: TestEmailDto,
  ) {
    return this.email.sendTest(dto.recipient);
  }
  @Get('status')
  @ApiOperation({ summary: 'Estado del servicio de correo' })
  status() {
    return this.email.status();
  }
  @Get('logs') @ApiOperation({ summary: 'Historial de correos' }) logs() {
    return this.email.logs();
  }
  @Get('queue') @ApiOperation({ summary: 'Cola de correos' }) queue() {
    return this.email.queue();
  }
}
