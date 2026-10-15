import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ContactsModule } from '../contacts/contacts.module';
import { EmailModule } from '../email/email.module';
import { MasterclassController } from './masterclass.controller';
import { MasterclassService } from './masterclass.service';
@Module({
  imports: [AuthModule, ContactsModule, EmailModule],
  controllers: [MasterclassController],
  providers: [MasterclassService],
})
export class MasterclassModule {}
