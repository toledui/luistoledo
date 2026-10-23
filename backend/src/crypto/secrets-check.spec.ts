import { ConfigService } from '@nestjs/config';
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EncryptionService } from './encryption.service';
import { checkEnvironmentKey, checkStoredSecrets } from './secrets-check';
import { PrismaService } from '../prisma/prisma.service';

describe('Deployment credential checks', () => {
  const encryption = new EncryptionService(
    new ConfigService({ APP_ENCRYPTION_KEY: 'original-test-key' }),
  );
  const metadata = [
    {
      tableName: 'PaymentProviderSetting',
      columnName: 'stripeSecretKeyEncrypted',
    },
    {
      tableName: 'PaymentProviderSetting',
      columnName: 'stripeWebhookSecretEncrypted',
    },
  ];
  const stored = [
    encryption.encrypt('private-stripe-key'),
    encryption.encrypt('private-webhook-secret'),
  ];
  const query = jest.fn();
  const prisma = { $queryRaw: query } as unknown as Pick<
    PrismaService,
    '$queryRaw'
  >;
  beforeEach(() => {
    query
      .mockReset()
      .mockResolvedValueOnce(metadata)
      .mockResolvedValueOnce([{ value: stored[0] }])
      .mockResolvedValueOnce([{ value: stored[1] }]);
  });

  it('authenticates existing credentials using only SELECT queries without changing ciphertext', async () => {
    const before = [...stored];
    await expect(checkStoredSecrets(prisma, encryption)).resolves.toBe(2);
    expect(stored).toEqual(before);
    for (const call of query.mock.calls as [{ sql: string }][]) {
      expect(call[0].sql.trim()).toMatch(/^SELECT /);
    }
  });
  it('rejects a changed master key and reports field names without exposing secrets or ciphertext', async () => {
    const wrongKey = new EncryptionService(
      new ConfigService({ APP_ENCRYPTION_KEY: 'changed-test-key' }),
    );
    const error = await checkStoredSecrets(prisma, wrongKey).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(Error);
    const message = (error as Error).message;
    expect(message).toContain(
      'PaymentProviderSetting.stripeSecretKeyEncrypted',
    );
    expect(message).toContain('stripeWebhookSecretEncrypted');
    for (const sensitive of [
      ...stored,
      'private-stripe-key',
      'private-webhook-secret',
      'changed-test-key',
    ]) {
      expect(message).not.toContain(sensitive);
    }
  });
  it('rejects damaged stored credentials without replacing them', async () => {
    query
      .mockReset()
      .mockResolvedValueOnce(metadata)
      .mockResolvedValueOnce([{ value: 'damaged-ciphertext' }])
      .mockResolvedValueOnce([{ value: stored[1] }]);
    await expect(checkStoredSecrets(prisma, encryption)).rejects.toThrow(
      'No se pueden descifrar',
    );
    expect(query).toHaveBeenCalledTimes(3);
  });
  it('handles an installation without credential tables', async () => {
    query.mockReset().mockResolvedValueOnce([]);
    await expect(checkStoredSecrets(prisma, encryption)).resolves.toBe(0);
    expect(query).toHaveBeenCalledTimes(1);
  });
  it('checks credentials when MySQL stores table names in lowercase', async () => {
    query
      .mockReset()
      .mockResolvedValueOnce(
        metadata.map((column) => ({
          ...column,
          tableName: column.tableName.toLowerCase(),
        })),
      )
      .mockResolvedValueOnce([{ value: stored[0] }])
      .mockResolvedValueOnce([{ value: stored[1] }]);
    await expect(checkStoredSecrets(prisma, encryption)).resolves.toBe(2);
    const calls = query.mock.calls as [{ sql: string }][];
    const sql = calls[1][0].sql;
    expect(sql).toContain('`paymentprovidersetting`');
  });
  it('ignores null credentials and checks only fields that exist in the current schema', async () => {
    query
      .mockReset()
      .mockResolvedValueOnce(metadata.slice(0, 1))
      .mockResolvedValueOnce([]);
    await expect(checkStoredSecrets(prisma, encryption)).resolves.toBe(0);
    expect(query).toHaveBeenCalledTimes(2);
  });
  it('detects a process environment override that differs from the saved .env', () => {
    const directory = mkdtempSync(join(tmpdir(), 'lta-secrets-check-'));
    const path = join(directory, '.env');
    try {
      writeFileSync(path, 'APP_ENCRYPTION_KEY=original-test-key\n');
      expect(() =>
        checkEnvironmentKey('original-test-key', path),
      ).not.toThrow();
      expect(() => checkEnvironmentKey('pm2-different-key', path)).toThrow(
        'difiere',
      );
    } finally {
      unlinkSync(path);
      rmdirSync(directory);
    }
  });
});
