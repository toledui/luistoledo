import {
  Body,
  Controller,
  Get,
  Headers,
  Ip,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactSettingsDto } from './dto/update-contact-settings.dto';

@Controller()
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}
  @Get('contacts/settings') publicSettings() {
    return this.contacts.publicSettings();
  }
  @Post('contacts') @Throttle({ default: { limit: 5, ttl: 60000 } }) create(
    @Body() dto: CreateContactDto,
    @Ip() ip: string,
    @Headers('user-agent') agent?: string,
  ) {
    return this.contacts.create(dto, ip, agent);
  }
  @Get('admin/contacts')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('settings.manage')
  list() {
    return this.contacts.list();
  }
  @Patch('admin/contacts/:id/read')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('settings.manage')
  read(@Param('id') id: string) {
    return this.contacts.markRead(id);
  }
  @Get('admin/contact-settings')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('settings.manage')
  adminSettings() {
    return this.contacts.adminSettings();
  }
  @Patch('admin/contact-settings')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('settings.manage')
  update(@Body() dto: UpdateContactSettingsDto) {
    return this.contacts.updateSettings(dto);
  }
}
