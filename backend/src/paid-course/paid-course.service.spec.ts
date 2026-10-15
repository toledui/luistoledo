import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaidCourseService } from './paid-course.service';
import { PAID_COURSE, PAID_COURSE_WHATSAPP } from './paid-course.constants';

describe('Paid course enrollment and installment lifecycle', () => {
  const prisma = {
    coursePaymentPlan: {
      findUniqueOrThrow: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    order: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
    },
    user: { findUniqueOrThrow: jest.fn(), findUnique: jest.fn() },
    course: { findUnique: jest.fn() },
    enrollment: { findUnique: jest.fn() },
    contactSetting: { findUnique: jest.fn() },
    emailProviderSetting: { findUnique: jest.fn() },
    generalSetting: { findUnique: jest.fn() },
    emailQueue: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  const tx = prisma as unknown as Prisma.TransactionClient;
  let service: PaidCourseService;
  const plan = {
    id: 'plan',
    userId: 'student',
    courseId: PAID_COURSE.courseId,
    option: 'INSTALLMENTS',
    total: new Prisma.Decimal(2480),
    initialAmount: new Prisma.Decimal(500),
    installmentAmount: new Prisma.Decimal(990),
    activatedAt: null,
  };
  const deposit = {
    id: 'deposit',
    userId: 'student',
    number: 'LTA-TEST',
    paymentPlanId: 'plan',
    installmentNumber: 1,
    total: new Prisma.Decimal(500),
  };
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-15T18:00:00Z'));
    jest.resetAllMocks();
    prisma.coursePaymentPlan.findUniqueOrThrow.mockResolvedValue(plan);
    prisma.coursePaymentPlan.upsert.mockResolvedValue(plan);
    prisma.coursePaymentPlan.updateMany.mockResolvedValue({ count: 1 });
    prisma.coursePaymentPlan.findMany.mockResolvedValue([{ id: 'plan' }]);
    prisma.user.findUnique.mockResolvedValue({ status: 'ACTIVE' });
    prisma.course.findUnique.mockResolvedValue({
      id: PAID_COURSE.courseId,
      status: 'PUBLISHED',
    });
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      firstName: 'Ana <script>',
      lastName: 'Prueba',
      email: 'ana@example.com',
    });
    prisma.contactSetting.findUnique.mockResolvedValue({
      recipientEmail: 'owner@example.com',
    });
    prisma.order.findMany.mockResolvedValue([
      { installmentNumber: 1, total: new Prisma.Decimal(500) },
      ...PAID_COURSE.installmentDueDates.map((due, index) => ({
        installmentNumber: index + 2,
        total: new Prisma.Decimal(990),
        dueAt: new Date(due),
      })),
    ]);
    prisma.order.count.mockResolvedValue(0);
    prisma.$transaction.mockImplementation(
      (callback: (client: typeof prisma) => unknown) => callback(prisma),
    );
    service = new PaidCourseService(
      prisma as unknown as PrismaService,
      { get: () => 'https://academy.example' } as unknown as ConfigService,
    );
  });
  afterEach(() => jest.useRealTimers());
  it('creates exactly two payable orders after a confirmed deposit, with the agreed amounts and dates', async () => {
    await service.onPaid(tx, deposit, 'STRIPE');
    const orders = (
      prisma.order.create.mock.calls as unknown as [
        { data: Prisma.OrderCreateInput },
      ][]
    ).map(([input]) => input.data);
    expect(orders).toHaveLength(2);
    expect(orders.map((order) => Number(order.total))).toEqual([990, 990]);
    expect(orders.map((order) => order.installmentNumber)).toEqual([2, 3]);
    expect(orders.map((order) => order.dueAt)).toEqual(
      PAID_COURSE.installmentDueDates.map((value) => new Date(value)),
    );
    expect(orders.every((order) => order.status === 'PENDING')).toBe(true);
    const emails = (
      prisma.emailQueue.create.mock.calls as unknown as [
        {
          data: {
            recipient: string;
            textContent: string;
            htmlContent: string;
            event: string;
          };
        },
      ][]
    ).map(([input]) => input.data);
    expect(emails).toHaveLength(2);
    expect(
      emails.find((email) => email.event === 'PAID_COURSE_ENROLLED')
        ?.textContent,
    ).toContain(PAID_COURSE_WHATSAPP);
    expect(
      emails.find((email) => email.event === 'PAID_COURSE_ADMIN_NOTIFICATION')
        ?.recipient,
    ).toBe('owner@example.com');
    expect(emails[0].htmlContent).not.toContain('<script>');
    expect(JSON.stringify(service.publicOffer())).not.toContain(
      'chat.whatsapp.com',
    );
  });
  it('does not duplicate orders or notifications when deposit confirmation is replayed', async () => {
    prisma.coursePaymentPlan.updateMany.mockResolvedValue({ count: 0 });
    await service.onPaid(tx, deposit, 'BANK_TRANSFER');
    expect(prisma.order.create).not.toHaveBeenCalled();
    expect(prisma.emailQueue.create).not.toHaveBeenCalled();
  });
  it('settles a cash plan without generating installment orders', async () => {
    prisma.coursePaymentPlan.findUniqueOrThrow.mockResolvedValue({
      ...plan,
      option: 'FULL',
      total: new Prisma.Decimal(1790),
    });
    await service.onPaid(
      tx,
      { ...deposit, total: new Prisma.Decimal(1790) },
      'BANK_TRANSFER',
    );
    expect(prisma.order.create).not.toHaveBeenCalled();
    expect(prisma.coursePaymentPlan.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          completedAt: expect.any(Date) as Date,
        }) as unknown,
      }),
    );
  });
  it('generates bank-transfer orders when the deposit was paid by bank transfer', async () => {
    await service.onPaid(tx, deposit, 'BANK_TRANSFER');
    const data = (
      prisma.order.create.mock.calls[0] as [
        {
          data: { status: string; payments: { create: { provider: string } } };
        },
      ]
    )[0].data;
    expect(data.status).toBe('AWAITING_PAYMENT');
    expect(data.payments.create.provider).toBe('BANK_TRANSFER');
  });
  it('marks the plan complete after the last installment and sends a receipt without resending welcome', async () => {
    await service.onPaid(
      tx,
      { ...deposit, installmentNumber: 3, total: new Prisma.Decimal(990) },
      'STRIPE',
    );
    expect(prisma.order.create).not.toHaveBeenCalled();
    expect(prisma.coursePaymentPlan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          completedAt: expect.any(Date) as Date,
        }) as unknown,
      }),
    );
    const data = (
      prisma.emailQueue.create.mock.calls[0] as [{ data: { event: string } }]
    )[0].data;
    expect(data.event).toBe('PAID_COURSE_PAYMENT_RECEIVED');
  });
  it('enforces registration closing at the CDMX deadline on the server', async () => {
    jest.setSystemTime(new Date('2026-11-19T06:00:00Z'));
    expect(service.publicOffer().registrationOpen).toBe(false);
    await expect(
      service.createInitialOrder('student', 'FULL', 'STRIPE'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.coursePaymentPlan.upsert).not.toHaveBeenCalled();
  });
  it('creates only the deposit before payment and keeps an unlisted course out of the regular cart', async () => {
    await service.createInitialOrder('student', 'INSTALLMENTS', 'STRIPE');
    expect(prisma.order.create).toHaveBeenCalledTimes(1);
    const data = (
      prisma.order.create.mock.calls[0] as [{ data: Prisma.OrderCreateInput }]
    )[0].data;
    expect(Number(data.total)).toBe(500);
    expect(data.installmentNumber).toBe(1);
    expect(prisma.emailQueue.create).not.toHaveBeenCalled();
  });
  it('atomically groups outstanding payments into at most one reminder, even on repeated scheduler runs', async () => {
    prisma.coursePaymentPlan.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    prisma.coursePaymentPlan.findUniqueOrThrow.mockResolvedValue({
      ...plan,
      user: { firstName: 'Ana', email: 'ana@example.com' },
      orders: [
        {
          number: 'LTA-2',
          total: 990,
          dueAt: new Date(PAID_COURSE.installmentDueDates[0]),
        },
        {
          number: 'LTA-3',
          total: 990,
          dueAt: new Date(PAID_COURSE.installmentDueDates[1]),
        },
      ],
    });
    await service.queueWeeklyReminders();
    await service.queueWeeklyReminders();
    expect(prisma.emailQueue.create).toHaveBeenCalledTimes(1);
    const email = (
      prisma.emailQueue.create.mock.calls[0] as [
        { data: { textContent: string } },
      ]
    )[0].data;
    expect(email.textContent).toContain('LTA-2');
    expect(email.textContent).toContain('LTA-3');
  });
});
