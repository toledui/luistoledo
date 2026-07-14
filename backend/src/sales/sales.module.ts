import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { EmailTemplateModule } from '../email-templates/email-template.module';
@Module({
  imports: [AuthModule, EmailTemplateModule],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
