import { Global, Module } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { EncryptionIntegrityService } from './encryption-integrity.service';

@Global()
@Module({
  providers: [EncryptionService, EncryptionIntegrityService],
  exports: [EncryptionService],
})
export class CryptoModule {}
