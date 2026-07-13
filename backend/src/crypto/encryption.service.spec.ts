import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  const service = new EncryptionService(
    new ConfigService({
      APP_ENCRYPTION_KEY: 'a-test-master-key-with-enough-entropy',
    }),
  );

  it('encrypts and authenticates a secret', () => {
    const encrypted = service.encrypt('smtp-secret');
    expect(encrypted).not.toContain('smtp-secret');
    expect(service.decrypt(encrypted)).toBe('smtp-secret');
  });

  it('rejects a modified payload', () => {
    const encrypted = service.encrypt('stripe-secret');
    expect(() => service.decrypt(`${encrypted.slice(0, -2)}aa`)).toThrow();
  });
});
