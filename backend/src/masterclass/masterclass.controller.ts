import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { ListMasterclassDto, RegisterMasterclassDto } from './masterclass.dto';
import { MasterclassService } from './masterclass.service';

@Controller()
export class MasterclassController {
  constructor(private readonly masterclass: MasterclassService) {}
  @Get('masterclass') settings() {
    return this.masterclass.publicSettings();
  }
  @Post('masterclass/registrations')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  register(@Body() dto: RegisterMasterclassDto, @Ip() ip: string) {
    return this.masterclass.register(dto, ip);
  }
  @Get('admin/masterclass/registrations')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('settings.manage')
  list(@Query() query: ListMasterclassDto) {
    return this.masterclass.list(query);
  }
  @Post('admin/masterclass/registrations/:id/notify')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('settings.manage')
  retry(@Param('id') id: string) {
    return this.masterclass.retryNotification(id);
  }
}
