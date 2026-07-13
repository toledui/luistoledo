import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';

@Module({
  imports: [AuthModule],
  controllers: [EmailController],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
