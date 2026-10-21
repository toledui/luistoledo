import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SendcorexController } from './sendcorex.controller';
import { SendcorexService } from './sendcorex.service';
@Global()
@Module({
  imports: [AuthModule],
  controllers: [SendcorexController],
  providers: [SendcorexService],
  exports: [SendcorexService],
})
export class SendcorexModule {}
