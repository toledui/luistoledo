import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from '../auth/auth.module';
import {
  AnalyticsPublicController,
  AnalyticsAdminController,
} from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsInterceptor } from './analytics.interceptor';
@Global()
@Module({
  imports: [AuthModule],
  controllers: [AnalyticsPublicController, AnalyticsAdminController],
  providers: [
    AnalyticsService,
    { provide: APP_INTERCEPTOR, useClass: AnalyticsInterceptor },
  ],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
