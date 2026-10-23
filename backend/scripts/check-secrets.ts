import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from '../src/crypto/encryption.service';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  checkEnvironmentKey,
  checkStoredSecrets,
  SecretsCheckError,
} from '../src/crypto/secrets-check';

async function run() {
  const config = new ConfigService();
  checkEnvironmentKey(config.getOrThrow<string>('APP_ENCRYPTION_KEY'));
  const encryption = new EncryptionService(config);
  const prisma = new PrismaService(config);
  try {
    const checked = await checkStoredSecrets(prisma, encryption);
    console.log(
      `Cifrado verificado: ${checked} credenciales; comprobación de solo lectura.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

void run().catch((error: unknown) => {
  console.error(
    error instanceof SecretsCheckError
      ? error.message
      : 'No se pudo verificar el cifrado. Revisa la conexión a MySQL, las variables del backend y el cliente Prisma generado.',
  );
  process.exitCode = 1;
});
