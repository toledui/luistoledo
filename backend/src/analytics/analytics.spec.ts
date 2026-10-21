import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { AnalyticsService } from './analytics.service';
import { attribution, cleanPath } from './analytics.helpers';
import { AnalyticsEventDto } from './analytics.dto';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../crypto/encryption.service';

describe('Analytics privacy and authoritative conversions', () => {
  const session = {
    id: 'session-1234567890',
    visitorId: 'visitor-1234567890',
    analyticsConsent: true,
    advertisingConsent: true,
    source: 'direct',
    lastNonDirectSource: 'chatgpt',
    userAgent: 'test-browser',
    gaClientId: '123.456',
    gaSessionId: '123456',
    lastSeenAt: new Date(),
    fbp: null,
    fbc: null,
  };
  const prisma = {
    analyticsSetting: { findUnique: jest.fn(), upsert: jest.fn() },
    analyticsSession: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
    },
    analyticsEvent: { upsert: jest.fn(), findUniqueOrThrow: jest.fn() },
    analyticsDelivery: {
      upsert: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    order: { findFirst: jest.fn() },
  };
  const order = {
    id: 'paid-order',
    analyticsSessionId: session.id,
    total: new Prisma.Decimal(500),
    currency: 'MXN',
    installmentNumber: 1,
    items: [{ courseId: 'course', title: 'Course' }],
  };
  let service: AnalyticsService;
  beforeEach(() => {
    jest.resetAllMocks();
    prisma.analyticsSetting.findUnique.mockResolvedValue({ enabled: true });
    prisma.analyticsSetting.upsert.mockResolvedValue({
      enabled: true,
      gaMeasurementId: 'G-TEST',
      gaSecretEncrypted: 'secret',
      metaPixelId: '123',
      metaTokenEncrypted: 'token',
      metaApiVersion: 'v25.0',
    });
    prisma.analyticsSession.findUnique.mockResolvedValue(session);
    prisma.analyticsEvent.findUniqueOrThrow.mockResolvedValue({
      name: 'purchase',
    });
    prisma.analyticsDelivery.updateMany.mockResolvedValue({ count: 1 });
    service = new AnalyticsService(
      prisma as unknown as PrismaService,
      { decrypt: (value: string) => value } as EncryptionService,
      { get: () => 'https://example.com' } as unknown as ConfigService,
    );
  });
  it('rejects forged purchases at the public ingestion boundary', async () => {
    const dto = plainToInstance(AnalyticsEventDto, {
      sessionId: session.id,
      eventId: 'event-1234567890',
      name: 'purchase',
      path: '/checkout',
    });
    expect((await validate(dto)).some((e) => e.property === 'name')).toBe(true);
  });
  it('removes sensitive URL fields and avoids spoofed referral domains', () => {
    expect(cleanPath('/checkout/exito?session_id=SECRET#token')).toBe(
      '/checkout/exito',
    );
    expect(cleanPath('/certificados/verificar/SECRET')).toBe(
      '/certificados/verificar/[code]',
    );
    expect(attribution({ referrer: 'https://chatgpt.com/c/private' })).toEqual({
      source: 'chatgpt',
      medium: 'ai_referral',
    });
    expect(
      attribution({ referrer: 'https://chatgpt.com.evil.example/' }).source,
    ).toBe('chatgpt.com.evil.example');
    expect(
      attribution({ referrer: 'https://gemini.google.com/app/' }).source,
    ).toBe('gemini');
    expect(attribution({})).toEqual({ source: 'direct', medium: 'none' });
    expect(attribution({ source: 'chatgpt.com' })).toEqual({
      source: 'chatgpt',
      medium: 'ai_referral',
    });
  });
  it('creates an idempotent paid installment event and durable deliveries in the supplied payment transaction', async () => {
    await service.purchase(
      prisma as unknown as Prisma.TransactionClient,
      order,
    );
    await service.purchase(
      prisma as unknown as Prisma.TransactionClient,
      order,
    );
    expect(prisma.analyticsEvent.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'purchase.paid-order' },
        update: {},
        create: expect.objectContaining({
          value: order.total,
          source: 'chatgpt',
          data: expect.objectContaining({ installment_number: 1 }) as unknown,
        }) as unknown,
      }),
    );
    expect(prisma.analyticsDelivery.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          eventId_provider: {
            eventId: 'purchase.paid-order',
            provider: 'META',
          },
        },
        update: {},
      }),
    );
  });
  it('does not enqueue external events after consent is withdrawn', async () => {
    prisma.analyticsSession.findUnique.mockResolvedValue({
      ...session,
      analyticsConsent: false,
      advertisingConsent: false,
    });
    await service.purchase(
      prisma as unknown as Prisma.TransactionClient,
      order,
    );
    expect(prisma.analyticsEvent.upsert).not.toHaveBeenCalled();
    expect(prisma.analyticsDelivery.upsert).not.toHaveBeenCalled();
  });
  it('attributes subsequent installments to the original order session', async () => {
    prisma.order.findFirst.mockResolvedValue({
      analyticsSessionId: session.id,
    });
    await service.purchase(prisma as unknown as Prisma.TransactionClient, {
      ...order,
      analyticsSessionId: null,
      paymentPlanId: 'plan',
      installmentNumber: 2,
    });
    expect(prisma.analyticsSession.findUnique).toHaveBeenCalledWith({
      where: { id: session.id },
    });
  });
  it('cancels queued events after consent is withdrawn without contacting providers', async () => {
    prisma.analyticsDelivery.findMany.mockResolvedValue([
      {
        id: 'job',
        provider: 'META',
        attempts: 0,
        event: { session: { ...session, advertisingConsent: false } },
      },
    ]);
    await service.deliver();
    expect(prisma.analyticsDelivery.update).toHaveBeenCalledWith({
      where: { id: 'job' },
      data: {
        status: 'SKIPPED',
        lastError: 'Consentimiento revocado o sesión eliminada',
      },
    });
  });
  it('sends server purchases with the same stable ID and the collected payment value', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ events_received: 1 }),
    } as Response);
    prisma.analyticsDelivery.findMany.mockResolvedValue([
      {
        id: 'job',
        provider: 'META',
        attempts: 0,
        event: {
          id: 'purchase.paid-order',
          name: 'purchase',
          createdAt: new Date(),
          path: '/checkout/exito',
          value: new Prisma.Decimal(500),
          currency: 'MXN',
          data: { transaction_id: 'paid-order' },
          session,
        },
      },
    ]);
    try {
      await service.deliver();
      const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string) as {
        data: { event_id: string; custom_data: { value: number } }[];
      };
      expect(body.data[0].event_id).toBe('purchase.paid-order');
      expect(body.data[0].custom_data.value).toBe(500);
      expect(prisma.analyticsDelivery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'SENT' }) as unknown,
        }),
      );
    } finally {
      fetchMock.mockRestore();
    }
  });
});
