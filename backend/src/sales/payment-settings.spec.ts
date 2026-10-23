import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { SalesService } from './sales.service';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../crypto/encryption.service';
import { checkEnvironmentKey } from '../crypto/secrets-check';
import { EmailTemplateService } from '../email-templates/email-template.service';
import { PaidCourseService } from '../paid-course/paid-course.service';
import { UpdatePaymentSettingsDto } from './dto/sales.dto';

jest.mock('../email-templates/email-template.service', () => ({
  EmailTemplateService: class {},
}));
jest.mock('../crypto/secrets-check', () => ({
  checkEnvironmentKey: jest.fn(),
}));

describe('Saving encrypted payment settings', () => {
  const config = new ConfigService({
    APP_ENCRYPTION_KEY: 'payment-settings-test-master-key',
  });
  const encryption = new EncryptionService(config);
  const upsert = jest.fn();
  const update = jest.fn();
  let stored: {
    id: number;
    stripeSecretKeyEncrypted: string;
    stripeWebhookSecretEncrypted: string;
  };
  let sales: SalesService;
  const dto: UpdatePaymentSettingsDto = {
    stripeEnabled: true,
    stripeMode: 'TEST',
    bankTransferEnabled: false,
    paymentDeadlineHours: 48,
  };
  beforeEach(() => {
    jest.mocked(checkEnvironmentKey).mockReset();
    stored = {
      id: 1,
      stripeSecretKeyEncrypted: encryption.encrypt('sk_test_preserved'),
      stripeWebhookSecretEncrypted: 'old-unreadable-webhook',
    };
    upsert.mockReset().mockImplementation(() => Promise.resolve({ ...stored }));
    update
      .mockReset()
      .mockImplementation(({ data }: { data: Partial<typeof stored> }) => {
        stored = { ...stored, ...data };
        return Promise.resolve({ ...stored });
      });
    sales = new SalesService(
      {
        paymentProviderSetting: { upsert, update },
      } as unknown as PrismaService,
      encryption,
      config,
      {} as EmailTemplateService,
      {} as PaidCourseService,
    );
  });
  it('replaces a damaged webhook with the supplied secret, preserving the Stripe API key', async () => {
    const previousApiKey = stored.stripeSecretKeyEncrypted;
    const response = await sales.updatePaymentSettings({
      ...dto,
      stripeWebhookSecret: '  whsec_replacement_test  ',
    });
    expect(encryption.decrypt(stored.stripeWebhookSecretEncrypted)).toBe(
      'whsec_replacement_test',
    );
    expect(stored.stripeSecretKeyEncrypted).toBe(previousApiKey);
    expect(response.stripeWebhookConfigured).toBe(true);
    expect(JSON.stringify(response)).not.toContain('whsec_replacement_test');
    expect(JSON.stringify(response)).not.toContain(
      stored.stripeWebhookSecretEncrypted,
    );
  });
  it('omits empty credential fields from UPDATE to avoid overwriting a concurrent secret replacement', async () => {
    await sales.updatePaymentSettings({
      ...dto,
      stripeSecretKey: '',
      stripeWebhookSecret: '   ',
    });
    const calls = update.mock.calls as [{ data: Record<string, unknown> }][];
    expect(calls[0][0].data).not.toHaveProperty('stripeSecretKeyEncrypted');
    expect(calls[0][0].data).not.toHaveProperty('stripeWebhookSecretEncrypted');
  });
  it('rejects writes from a runtime with an inconsistent encryption key before changing the database', async () => {
    jest.mocked(checkEnvironmentKey).mockImplementation(() => {
      throw new Error('key mismatch');
    });
    await expect(
      sales.updatePaymentSettings({
        ...dto,
        stripeWebhookSecret: 'whsec_test',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(upsert).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });
});
