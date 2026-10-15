import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermissions } from './permissions.decorator';
import { API_KEY_SCOPES, CreateApiKeyDto } from './api-key.dto';
import { ApiKeysService } from './api-keys.service';
import type { AuthenticatedRequest } from './authenticated-request';

@Controller('admin/settings/api-keys')
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermissions('settings.manage')
export class ApiKeysController {
  constructor(private readonly keys: ApiKeysService) {}
  @Get() list(@Req() req: AuthenticatedRequest) {
    return this.keys.list(req.auth.sub);
  }
  @Get('scopes') scopes() {
    return API_KEY_SCOPES;
  }
  @Post()
  @Header('Cache-Control', 'no-store')
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateApiKeyDto) {
    return this.keys.create(req.auth.sub, dto);
  }
  @Post(':id/revoke') revoke(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.keys.revoke(req.auth.sub, id);
  }
}
