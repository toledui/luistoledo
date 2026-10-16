import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContactsService } from './contacts.service';
import { EncryptionService } from '../crypto/encryption.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

describe('ContactsService Turnstile verification', () => {
  const encryption = (key: string) =>
    new EncryptionService(new ConfigService({ APP_ENCRYPTION_KEY: key }));
  const currentEncryption = encryption('current-test-key');
  const settings = {
    turnstileEnabled: true,
    turnstileSiteKey: 'site-key',
    turnstileSecretEncrypted: '',
  };
  const prisma = { contactSetting: { upsert: jest.fn() } };
  let service: ContactsService;
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    jest.resetAllMocks();
    settings.turnstileEnabled = true;
    settings.turnstileSecretEncrypted =
      encryption('original-test-key').encrypt('test-secret');
    prisma.contactSetting.upsert.mockImplementation(() =>
      Promise.resolve({ ...settings }),
    );
    service = new ContactsService(
      prisma as unknown as PrismaService,
      currentEncryption,
      {} as EmailService,
    );
    fetchSpy = jest.spyOn(global, 'fetch');
    fetchSpy.mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    } as Response);
  });
  afterEach(() => jest.restoreAllMocks());

  it('returns a controlled 503 when the encryption key cannot decrypt the stored secret', async () => {
    await expect(service.verifyTurnstile('token')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('verifies again after saving the secret with the current encryption key', async () => {
    await service.updateSettings({ turnstileSecretKey: 'test-secret' });
    const calls = prisma.contactSetting.upsert.mock.calls as unknown as [
      { update: { turnstileSecretEncrypted: string } },
    ][];
    const saved = calls[0][0];
    settings.turnstileSecretEncrypted = saved.update.turnstileSecretEncrypted;
    await expect(
      service.verifyTurnstile('token', '127.0.0.1'),
    ).resolves.toBeUndefined();
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    );
    expect(options?.method).toBe('POST');
    expect((options?.body as URLSearchParams).get('secret')).toBe(
      'test-secret',
    );
    expect((options?.body as URLSearchParams).get('response')).toBe('token');
    expect((options?.body as URLSearchParams).get('remoteip')).toBe(
      '127.0.0.1',
    );
  });

  it('still rejects an invalid challenge after restoring the secret', async () => {
    settings.turnstileSecretEncrypted =
      currentEncryption.encrypt('test-secret');
    fetchSpy.mockResolvedValue({
      json: () => Promise.resolve({ success: false }),
    } as Response);
    await expect(
      service.verifyTurnstile('invalid-token'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('skips verification only when Turnstile is explicitly disabled', async () => {
    settings.turnstileEnabled = false;
    await expect(service.verifyTurnstile(undefined)).resolves.toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
