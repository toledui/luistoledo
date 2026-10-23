import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import Stripe from 'stripe';
import { SalesService } from './sales.service';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../crypto/encryption.service';
import { EmailTemplateService } from '../email-templates/email-template.service';
import { PaidCourseService } from '../paid-course/paid-course.service';
jest.mock('../email-templates/email-template.service', () => ({
  EmailTemplateService: class {},
}));

describe('Hosted Stripe Checkout with automatic currency conversion', () => {
  let sales: SalesService;
  const secret = 'whsec_unit_test_only';
  const settings = {
    stripeEnabled: true,
    stripeMode: 'TEST',
    stripePublishableKey: null,
    stripeWebhookSecretEncrypted: 'encrypted',
  };
  const payment = {
    id: 'payment',
    provider: 'STRIPE',
    status: 'PENDING',
    externalId: 'cs_test_session',
  };
  const order = {
    id: 'order',
    userId: 'student',
    status: 'PENDING',
    currency: 'MXN',
    total: new Prisma.Decimal(500),
    items: [{ title: 'Curso' }],
    payments: [payment],
  };
  const session = {
    id: 'cs_test_session',
    status: 'open',
    payment_status: 'unpaid',
    ui_mode: 'hosted_page',
    url: 'https://checkout.stripe.com/c/pay/test',
    currency: 'mxn',
    amount_total: 50000,
    client_reference_id: 'order',
    metadata: { orderId: 'order', userId: 'student' },
    presentment_details: {
      presentment_amount: 2800,
      presentment_currency: 'usd',
    },
  };
  const prisma = {
    order: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    payment: { findFirst: jest.fn(), updateMany: jest.fn() },
    paymentEvent: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const client = new Stripe('sk_test_unit');
  const retrieve = jest.spyOn(client.checkout.sessions, 'retrieve');
  const create = jest.spyOn(client.checkout.sessions, 'create');
  const expire = jest.spyOn(client.checkout.sessions, 'expire');
  const complete = jest.fn();
  beforeEach(() => {
    jest.resetAllMocks();
    prisma.order.findFirst.mockResolvedValue(order);
    prisma.order.findUnique.mockResolvedValue(order);
    prisma.order.findUniqueOrThrow.mockImplementation(
      async () => (await prisma.order.findFirst()) as typeof order,
    );
    prisma.$transaction.mockImplementation(
      (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );
    prisma.payment.updateMany.mockResolvedValue({ count: 1 });
    prisma.payment.findFirst.mockResolvedValue({ externalId: null });
    retrieve.mockResolvedValue(
      session as unknown as Stripe.Response<Stripe.Checkout.Session>,
    );
    create.mockResolvedValue(
      session as unknown as Stripe.Response<Stripe.Checkout.Session>,
    );
    expire.mockResolvedValue({
      ...session,
      status: 'expired',
    } as unknown as Stripe.Response<Stripe.Checkout.Session>);
    sales = new SalesService(
      prisma as unknown as PrismaService,
      { decrypt: () => secret } as unknown as EncryptionService,
      new ConfigService({ FRONTEND_URL: 'https://academy.example' }),
      {} as EmailTemplateService,
      {} as PaidCourseService,
    );
    Object.defineProperty(sales, 'stripeClient', {
      value: jest.fn().mockResolvedValue({ client, settings }),
    });
    Object.defineProperty(sales, 'completePayment', { value: complete });
  });
  it('keeps the original hosted redirect and return URLs while enabling Adaptive Pricing', async () => {
    prisma.order.findFirst.mockResolvedValue({
      ...order,
      payments: [{ ...payment, externalId: null }],
    });
    const result = await sales.resumePayment('student', 'order');
    const request = create.mock.calls[0][0]!;
    expect(request).toEqual(
      expect.objectContaining({
        mode: 'payment',
        adaptive_pricing: { enabled: true },
        success_url:
          'https://academy.example/checkout/exito?order=order&session_id={CHECKOUT_SESSION_ID}',
        cancel_url:
          'https://academy.example/mi-aprendizaje/pedidos?cancelled=1&order=order',
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'mxn',
              unit_amount: 50000,
              product_data: { name: 'Curso' },
            },
          },
        ],
      }),
    );
    expect(request).not.toHaveProperty('return_url');
    expect(request).not.toHaveProperty('ui_mode');
    expect(result.checkoutUrl).toBe(session.url);
    expect(result).not.toHaveProperty('clientSecret');
    expect(create.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        idempotencyKey: 'lta-order-initial-MXN-50000',
      }),
    );
  });
  it('reuses an open hosted session without creating another', async () => {
    await expect(sales.resumePayment('student', 'order')).resolves.toEqual({
      orderId: 'order',
      checkoutUrl: session.url,
    });
    expect(create).not.toHaveBeenCalled();
  });
  it('honors a verified USD quote, disables Adaptive Pricing and binds the actual charge separately from MXN', async () => {
    const verify = jest.fn().mockReturnValue({
      currency: 'USD',
      amount: 2800,
      base: '500.00',
      rate: '0.056',
      at: Date.now(),
      exp: Date.now() + 60000,
    });
    Object.defineProperty(sales, 'currencies', {
      value: { verify },
    });
    create.mockResolvedValue({
      ...session,
      currency: 'usd',
      amount_total: 2800,
      adaptive_pricing: { enabled: false },
    } as unknown as Stripe.Response<Stripe.Checkout.Session>);
    await sales.resumePayment('student', 'order', 'signed-quote');
    expect(verify).toHaveBeenCalledWith('signed-quote', order.total);
    expect(expire).toHaveBeenCalledWith(session.id);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        adaptive_pricing: { enabled: false },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'usd',
              unit_amount: 2800,
              product_data: { name: 'Curso' },
            },
          },
        ],
      }),
      expect.anything(),
    );
    expect(prisma.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          checkoutCurrency: 'USD',
          checkoutAmount: 2800,
        }) as unknown,
      }),
    );
    expect(order.currency).toBe('MXN');
  });
  it('does not create a payment when the quote is invalid or expired', async () => {
    Object.defineProperty(sales, 'currencies', {
      value: {
        verify: () => {
          throw new Error('Quote expired');
        },
      },
    });
    await expect(
      sales.resumePayment('student', 'order', 'bad'),
    ).rejects.toThrow('Quote expired');
    expect(create).not.toHaveBeenCalled();
  });
  it('confirms a manually selected currency using its persisted amount instead of comparing it to MXN', async () => {
    prisma.order.findFirst.mockResolvedValue({
      ...order,
      payments: [
        {
          ...payment,
          checkoutCurrency: 'USD',
          checkoutAmount: new Prisma.Decimal(2800),
        },
      ],
    });
    retrieve.mockResolvedValue({
      ...session,
      status: 'complete',
      payment_status: 'paid',
      currency: 'usd',
      amount_total: 2800,
      presentment_details: undefined,
    } as unknown as Stripe.Response<Stripe.Checkout.Session>);
    await sales.confirmStripeCheckout('student', 'order', session.id);
    expect(complete).toHaveBeenCalledWith(
      'order',
      'payment',
      'STRIPE',
      session.id,
      { presentment_amount: 2800, presentment_currency: 'usd' },
    );
  });
  it('expires an old inline session before replacing it with a hosted session', async () => {
    retrieve.mockResolvedValue({
      ...session,
      ui_mode: 'elements',
      url: null,
    } as unknown as Stripe.Response<Stripe.Checkout.Session>);
    await expect(sales.resumePayment('student', 'order')).resolves.toEqual({
      orderId: 'order',
      checkoutUrl: session.url,
    });
    expect(expire).toHaveBeenCalledWith(session.id);
    expect(expire.mock.invocationCallOrder[0]).toBeLessThan(
      create.mock.invocationCallOrder[0],
    );
  });
  it('does not create another session if the inline session cannot be expired', async () => {
    retrieve.mockResolvedValue({
      ...session,
      ui_mode: 'elements',
      url: null,
    } as unknown as Stripe.Response<Stripe.Checkout.Session>);
    expire.mockRejectedValue(new Error('Payment status changed'));
    await expect(sales.resumePayment('student', 'order')).rejects.toThrow(
      'Payment status changed',
    );
    expect(create).not.toHaveBeenCalled();
  });
  it('does not access Stripe for another user’s order', async () => {
    prisma.order.findFirst.mockResolvedValue(null);
    await expect(sales.resumePayment('intruder', 'order')).rejects.toThrow(
      'Pedido no encontrado',
    );
    expect(retrieve).not.toHaveBeenCalled();
  });
  it.each([
    { amount_total: 1 },
    { currency: 'usd' },
    { metadata: { orderId: 'other', userId: 'student' } },
  ])('rejects mismatched sessions: %j', async (change) => {
    retrieve.mockResolvedValue({
      ...session,
      ...change,
    } as unknown as Stripe.Response<Stripe.Checkout.Session>);
    await expect(sales.resumePayment('student', 'order')).rejects.toThrow(
      'Los datos del pago de Stripe no coinciden',
    );
    expect(create).not.toHaveBeenCalled();
  });
  it('does not treat an unpaid return as a successful purchase', async () => {
    await expect(
      sales.confirmStripeCheckout('student', 'order', session.id),
    ).rejects.toThrow('todavía no ha sido completado');
    expect(complete).not.toHaveBeenCalled();
  });
  it('validates the MXN total and records the converted amount on confirmation', async () => {
    retrieve.mockResolvedValue({
      ...session,
      status: 'complete',
      payment_status: 'paid',
    } as unknown as Stripe.Response<Stripe.Checkout.Session>);
    await sales.confirmStripeCheckout('student', 'order', session.id);
    expect(complete).toHaveBeenCalledWith(
      'order',
      'payment',
      'STRIPE',
      session.id,
      session.presentment_details,
    );
  });
  it('rejects forged webhook signatures', async () => {
    await expect(
      sales.processStripeWebhook('invalid', Buffer.from('{}')),
    ).rejects.toThrow('Firma de webhook inválida');
    expect(complete).not.toHaveBeenCalled();
  });
  it('confirms signed converted payments and ignores already processed events', async () => {
    const body = Buffer.from(
      JSON.stringify({
        id: 'evt_test',
        type: 'checkout.session.completed',
        livemode: false,
        data: {
          object: { ...session, status: 'complete', payment_status: 'paid' },
        },
      }),
    );
    const signature = Stripe.webhooks.generateTestHeaderString({
      payload: body.toString(),
      secret,
    });
    await sales.processStripeWebhook(signature, body);
    expect(complete).toHaveBeenCalledWith(
      'order',
      'payment',
      'STRIPE',
      session.id,
      session.presentment_details,
    );
    complete.mockClear();
    prisma.paymentEvent.findUnique.mockResolvedValue({ processed: true });
    await expect(sales.processStripeWebhook(signature, body)).resolves.toEqual({
      received: true,
      duplicate: true,
    });
    expect(complete).not.toHaveBeenCalled();
  });
});
