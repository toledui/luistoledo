import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../crypto/encryption.service';
import { EmailTemplateService } from '../email-templates/email-template.service';
import { PaidCourseService } from '../paid-course/paid-course.service';
import { SalesService } from './sales.service';
import { SendcorexService } from '../sendcorex/sendcorex.service';
jest.mock('../email-templates/email-template.service', () => ({
  EmailTemplateService: class {},
}));

describe('Atomic payment confirmation shared by transfer and Stripe', () => {
  const prisma = {
    order: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      updateMany: jest.fn(),
    },
    payment: { updateMany: jest.fn() },
    coursePaymentPlan: { update: jest.fn() },
    enrollment: { upsert: jest.fn() },
    cartItem: { deleteMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const course = { onPaid: jest.fn() };
  const templates = { sendEvent: jest.fn() };
  const sendcorex = { enrollment: jest.fn() };
  const order = {
    id: 'deposit',
    number: 'LTA-TEST',
    userId: 'student',
    paymentPlanId: 'plan',
    installmentNumber: 1,
    status: 'AWAITING_PAYMENT',
    total: new Prisma.Decimal(500),
    couponId: null,
    items: [{ courseId: 'course', title: 'Course' }],
    payments: [{ id: 'payment', provider: 'BANK_TRANSFER', status: 'PENDING' }],
  };
  let sales: SalesService;
  beforeEach(() => {
    jest.resetAllMocks();
    prisma.order.findUnique.mockResolvedValue(order);
    prisma.order.findUniqueOrThrow.mockResolvedValue(order);
    prisma.order.updateMany.mockResolvedValue({ count: 1 });
    prisma.payment.updateMany.mockResolvedValue({ count: 1 });
    prisma.$transaction.mockImplementation(
      (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );
    sales = new SalesService(
      prisma as unknown as PrismaService,
      {} as EncryptionService,
      {} as ConfigService,
      templates as unknown as EmailTemplateService,
      course as unknown as PaidCourseService,
      undefined,
      sendcorex as unknown as SendcorexService,
    );
  });
  it('confirms the payment and activates the enrollment in the same transaction as the installment plan', async () => {
    await sales.approveBankTransfer('deposit');
    expect(course.onPaid).toHaveBeenCalledWith(prisma, order, 'BANK_TRANSFER');
    expect(sendcorex.enrollment).toHaveBeenCalledWith(
      prisma,
      'student',
      'course',
    );
    expect(prisma.enrollment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          userId: 'student',
          courseId: 'course',
          source: 'PAID_COURSE',
        }) as unknown,
      }),
    );
    expect(prisma.cartItem.deleteMany).not.toHaveBeenCalled();
    expect(templates.sendEvent).not.toHaveBeenCalled(); // Welcome is in the transactional outbox.
  });
  it('does not repeat enrollment, orders or emails when another confirmation already claimed the payment', async () => {
    prisma.order.updateMany.mockResolvedValue({ count: 0 });
    prisma.order.findUniqueOrThrow.mockResolvedValue({
      ...order,
      status: 'PAID',
    });
    await sales.approveBankTransfer('deposit');
    expect(course.onPaid).not.toHaveBeenCalled();
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    expect(prisma.enrollment.upsert).not.toHaveBeenCalled();
    expect(sendcorex.enrollment).not.toHaveBeenCalled();
  });
  it('does not reactivate an enrollment when paying later installments', async () => {
    prisma.order.findUniqueOrThrow.mockResolvedValue({
      ...order,
      installmentNumber: 2,
    });
    await sales.approveBankTransfer('deposit');
    expect(course.onPaid).toHaveBeenCalled();
    expect(prisma.enrollment.upsert).not.toHaveBeenCalled();
    expect(sendcorex.enrollment).not.toHaveBeenCalled();
  });
  it('persists local presentment amounts inside the same transaction that fulfills the order', async () => {
    const internal = sales as unknown as {
      completePayment(
        orderId: string,
        paymentId: string,
        provider: string,
        externalId: string,
        presentment: {
          presentment_amount: number;
          presentment_currency: string;
        },
      ): Promise<unknown>;
    };
    await internal.completePayment('deposit', 'payment', 'STRIPE', 'cs_test', {
      presentment_amount: 2800,
      presentment_currency: 'usd',
    });
    expect(prisma.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'SUCCEEDED',
          presentmentAmount: 2800,
          presentmentCurrency: 'USD',
        }) as unknown,
      }),
    );
    expect(course.onPaid).toHaveBeenCalledWith(prisma, order, 'STRIPE');
  });
});
