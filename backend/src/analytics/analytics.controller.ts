import {
  Body,
  Controller,
  Get,
  Header,
  Ip,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { AnalyticsService } from './analytics.service';
import {
  AnalyticsEventDto,
  AnalyticsSessionDto,
  AnalyticsSettingsDto,
} from './analytics.dto';

@Controller('analytics')
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 120, ttl: 60000 } })
export class AnalyticsPublicController {
  constructor(private readonly analytics: AnalyticsService) {}
  @Get('config') @Header('Cache-Control', 'no-store') config() {
    return this.analytics.publicSettings();
  }
  @Post('session') session(
    @Body() dto: AnalyticsSessionDto,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    return this.analytics.session(dto, ip, req.header('user-agent'));
  }
  @Post('events') event(@Body() dto: AnalyticsEventDto) {
    return this.analytics.collect(dto);
  }
}

@Controller('admin/analytics')
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermissions('analytics.read')
export class AnalyticsAdminController {
  constructor(private readonly analytics: AnalyticsService) {}
  @Get('summary') summary(@Query('days') days?: string) {
    return this.analytics.summary(days);
  }
  @Get('visits')
  @RequirePermissions('analytics.read', 'analytics.ip.read')
  visits(@Query('days') days?: string, @Query('page') page?: string) {
    return this.analytics.visits(days, page);
  }
  @Get('reports') reports(@Query('days') days?: string) {
    return this.analytics.reports(days);
  }
  @Get('settings') @RequirePermissions('settings.manage') settings() {
    return this.analytics.adminSettings();
  }
  @Patch('settings') @RequirePermissions('settings.manage') save(
    @Body() dto: AnalyticsSettingsDto,
    @Req() req: AuthenticatedRequest,
    @Ip() ip: string,
  ) {
    return this.analytics.saveSettings(dto, req.auth.sub, ip);
  }
}
