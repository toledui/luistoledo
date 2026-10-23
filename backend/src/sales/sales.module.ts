import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { EmailTemplateModule } from '../email-templates/email-template.module';
import { PaidCourseModule } from '../paid-course/paid-course.module';
import { CurrenciesService } from './currencies.service';
@Module({
  imports: [AuthModule, EmailTemplateModule, PaidCourseModule],
  controllers: [SalesController],
  providers: [SalesService, CurrenciesService],
})
export class SalesModule {}
