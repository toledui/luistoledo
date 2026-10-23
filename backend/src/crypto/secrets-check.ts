import { Prisma } from '@prisma/client';
import { existsSync, readFileSync } from 'node:fs';
import { parse } from 'dotenv';
import { EncryptionService } from './encryption.service';
import { PrismaService } from '../prisma/prisma.service';

const credentials = [
  ['PaymentProviderSetting', 'stripeSecretKeyEncrypted'],
  ['PaymentProviderSetting', 'stripeWebhookSecretEncrypted'],
  ['EmailProviderSetting', 'usernameEncrypted'],
  ['EmailProviderSetting', 'passwordEncrypted'],
  ['ContactSetting', 'turnstileSecretEncrypted'],
  ['SendcorexSetting', 'apiKeyEncrypted'],
  ['AnalyticsSetting', 'gaSecretEncrypted'],
  ['AnalyticsSetting', 'metaTokenEncrypted'],
  ['AnalyticsSetting', 'googleCredentialsEncrypted'],
] as const;

export class SecretsCheckError extends Error {}

export function checkEnvironmentKey(effectiveKey: string, path = '.env') {
  if (!existsSync(path)) return;
  const fileKey = parse(readFileSync(path)).APP_ENCRYPTION_KEY;
  if (fileKey && fileKey !== effectiveKey) {
    throw new SecretsCheckError(
      'APP_ENCRYPTION_KEY del proceso difiere de backend/.env. Revisa PM2 y conserva la clave original; no generes otra.',
    );
  }
}

// Read metadata first so this also works before migrations on an older/empty schema.
export async function checkStoredSecrets(
  prisma: Pick<PrismaService, '$queryRaw'>,
  encryption: Pick<EncryptionService, 'decrypt'>,
) {
  const columns = await prisma.$queryRaw<
    { tableName: string; columnName: string }[]
  >(Prisma.sql`
    SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName
    FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()
  `);
  const existing = new Map(
    columns.map((c) => [`${c.tableName}.${c.columnName}`.toLowerCase(), c]),
  );
  const invalid: string[] = [];
  let checked = 0;
  for (const [table, column] of credentials) {
    const name = `${table}.${column}`;
    const actual = existing.get(name.toLowerCase());
    if (!actual) continue;
    // Use the database casing, matched against the static allowlist above.
    const identifier = Prisma.raw('`' + actual.columnName + '`');
    const rows = await prisma.$queryRaw<{ value: string }[]>(Prisma.sql`
      SELECT ${identifier} AS value FROM ${Prisma.raw('`' + actual.tableName + '`')}
      WHERE ${identifier} IS NOT NULL
    `);
    for (const row of rows) {
      try {
        encryption.decrypt(row.value);
        checked++;
      } catch {
        invalid.push(name);
        break;
      }
    }
  }
  if (invalid.length) {
    throw new SecretsCheckError(
      `No se pueden descifrar: ${invalid.join(', ')}. Recupera APP_ENCRYPTION_KEY original o vuelve a guardar las credenciales afectadas con la clave definitiva. No se modificó ningún secreto.`,
    );
  }
  return checked;
}
