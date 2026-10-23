import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { EncryptionIntegrityService } from './encryption-integrity.service';
import { EncryptionService } from './encryption.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  checkEnvironmentKey,
  checkStoredSecrets,
  SecretsCheckError,
} from './secrets-check';
jest.mock('./secrets-check', () => ({
  ...jest.requireActual<typeof import('./secrets-check')>('./secrets-check'),
  checkEnvironmentKey: jest.fn(),
  checkStoredSecrets: jest.fn(),
}));

it('reports a runtime key mismatch while keeping the admin available for repair', async () => {
  jest.mocked(checkEnvironmentKey).mockImplementation(() => {
    throw new SecretsCheckError('APP_ENCRYPTION_KEY difiere');
  });
  const log = jest
    .spyOn(Logger.prototype, 'error')
    .mockImplementation(() => undefined);
  try {
    const service = new EncryptionIntegrityService(
      new ConfigService({ APP_ENCRYPTION_KEY: 'unit-test-key' }),
      {} as PrismaService,
      {} as EncryptionService,
    );
    await expect(service.onApplicationBootstrap()).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith('APP_ENCRYPTION_KEY difiere');
    expect(checkStoredSecrets).not.toHaveBeenCalled();
  } finally {
    log.mockRestore();
  }
});
