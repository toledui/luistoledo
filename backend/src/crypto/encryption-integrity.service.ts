import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from './encryption.service';
import {
  checkEnvironmentKey,
  checkStoredSecrets,
  SecretsCheckError,
} from './secrets-check';

@Injectable()
export class EncryptionIntegrityService implements OnApplicationBootstrap {
  private readonly logger = new Logger(EncryptionIntegrityService.name);
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async onApplicationBootstrap() {
    try {
      checkEnvironmentKey(this.config.getOrThrow<string>('APP_ENCRYPTION_KEY'));
      await checkStoredSecrets(this.prisma, this.encryption);
    } catch (error) {
      // Keep the admin available to restore credentials; never log ciphertext or keys.
      this.logger.error(
        error instanceof SecretsCheckError
          ? error.message
          : 'No se pudo verificar la integridad de las credenciales cifradas al arrancar. Ejecuta npm run secrets:check desde backend.',
      );
    }
  }
}
