import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SalesService } from './sales.service';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../crypto/encryption.service';
import { EmailTemplateService } from '../email-templates/email-template.service';
import { PaidCourseService } from '../paid-course/paid-course.service';
import { CurrenciesService } from './currencies.service';
jest.mock('../email-templates/email-template.service', () => ({
  EmailTemplateService: class {},
}));

describe('Stripe encrypted credential failure', () => {
  const decrypt = jest.fn();
  const settings = {
    stripeEnabled: true,
    stripeMode: 'TEST',
    stripeSecretKeyEncrypted: 'ciphertext-private',
    stripeWebhookSecretEncrypted: 'ciphertext-webhook',
  };
  let log: jest.SpyInstance;
  let sales: SalesService;
  beforeEach(() => {
    decrypt.mockReset().mockImplementation(() => {
      throw new Error('crypto-error-with-private-details');
    });
    log = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    sales = new SalesService(
      {
        paymentProviderSetting: {
          upsert: jest.fn().mockResolvedValue(settings),
        },
      } as unknown as PrismaService,
      { decrypt } as unknown as EncryptionService,
      new ConfigService(),
      {} as EmailTemplateService,
      {} as PaidCourseService,
      undefined,
      undefined,
      {} as CurrenciesService,
    );
  });
  afterEach(() => log.mockRestore());
  it('returns a controlled 503 and a safe diagnostic instead of exposing a crypto error', async () => {
    const error = await sales
      .currencyQuote(500, 'USD')
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect((error as ServiceUnavailableException).getStatus()).toBe(503);
    expect(
      JSON.stringify((error as ServiceUnavailableException).getResponse()),
    ).not.toContain('private');
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('APP_ENCRYPTION_KEY'),
    );
    expect(JSON.stringify(log.mock.calls)).not.toMatch(
      /ciphertext|crypto-error/,
    );
  });
  it('also identifies an undecryptable webhook secret as service unavailability', async () => {
    decrypt
      .mockReset()
      .mockReturnValueOnce('sk_test_unit_test_only')
      .mockImplementation(() => {
        throw new Error('bad webhook key');
      });
    await expect(
      sales.processStripeWebhook('test-signature', Buffer.from('{}')),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
