import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { AuthGuard } from '../auth/auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { TemplateTestDto } from './dto/template-test.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { EmailTemplateService } from './email-template.service';

@Controller('admin/email/templates')
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermissions('settings.manage')
export class EmailTemplateController {
  constructor(private readonly templates: EmailTemplateService) {}
  @Get() list() {
    return this.templates.list();
  }
  @Get('variables') variables() {
    return this.templates.allowedVariables();
  }
  @Get(':id') get(@Param('id') id: string) {
    return this.templates.get(id);
  }
  @Patch(':id') update(
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.templates.update(id, dto, {
      id: request.auth.sub,
      email: request.auth.email,
    });
  }
  @Post(':id/preview') preview(@Param('id') id: string) {
    return this.templates.preview(id);
  }
  @Post(':id/test') test(
    @Param('id') id: string,
    @Body() dto: TemplateTestDto,
  ) {
    return this.templates.sendTest(id, dto.recipient);
  }
  @Post(':id/reset') reset(@Param('id') id: string) {
    return this.templates.reset(id);
  }
  @Post(':id/duplicate') duplicate(@Param('id') id: string) {
    return this.templates.duplicate(id);
  }
}
