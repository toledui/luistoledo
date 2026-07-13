import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { AuthGuard } from '../auth/auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { ListUsersDto } from './dto/list-users.dto';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UsersService } from './users.service';
@Controller('admin/users')
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermissions('users.manage')
export class UsersController {
  constructor(private readonly users: UsersService) {}
  @Get() list(@Query() query: ListUsersDto) {
    return this.users.list(query);
  }
  @Get('roles') roles() {
    return this.users.roles();
  }
  @Get(':id') get(@Param('id') id: string) {
    return this.users.get(id);
  }
  @Patch(':id/status') status(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.users.updateStatus(id, dto.status, req.auth.sub);
  }
  @Patch(':id/roles') updateRoles(
    @Param('id') id: string,
    @Body() dto: UpdateUserRolesDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.users.updateRoles(id, dto.roles, req.auth.sub);
  }
  @Post(':id/sessions/:sessionId/revoke') revoke(
    @Param('id') id: string,
    @Param('sessionId') sessionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.users.revokeSession(id, sessionId, req.auth.sub);
  }
  @Post(':id/sessions/revoke-all') revokeAll(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.users.revokeAll(id, req.auth.sub);
  }
}
