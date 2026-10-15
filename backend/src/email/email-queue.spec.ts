import nodemailer from 'nodemailer';
import { EmailProvider, EmailQueueStatus } from '@prisma/client';
import { EmailService } from './email.service';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../crypto/encryption.service';
import { Logger } from '@nestjs/common';

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: { createTransport: jest.fn() },
}));

describe('Immediate queued email delivery', () => {
  const sendMail = jest.fn();
  const prisma = {
    emailProviderSetting: { upsert: jest.fn(), update: jest.fn() },
    emailQueue: {
      updateMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    emailLog: { create: jest.fn() },
    coursePaymentPlan: { findFirst: jest.fn() },
  };
  let service: EmailService;
  it('cancels an old payment reminder after the plan is paid or reminders are paused', async () => {
    prisma.emailQueue.findUniqueOrThrow.mockResolvedValue({
      id: 'queue-1',
      event: 'PAID_COURSE_PAYMENT_REMINDER',
      userId: 'student',
      courseId: 'course',
      createdAt: new Date(),
    });
    prisma.coursePaymentPlan.findFirst.mockResolvedValue(null);
    await service.processItem('queue-1');
    expect(sendMail).not.toHaveBeenCalled();
    expect(prisma.emailQueue.update).toHaveBeenCalledWith({
      where: { id: 'queue-1' },
      data: { status: EmailQueueStatus.CANCELLED },
    });
  });
  beforeEach(() => {
    jest.resetAllMocks();
    jest
      .mocked(nodemailer.createTransport)
      .mockReturnValue({ sendMail } as unknown as ReturnType<
        typeof nodemailer.createTransport
      >);
    prisma.emailProviderSetting.upsert.mockResolvedValue({
      enabled: true,
      provider: EmailProvider.SMTP,
      host: 'smtp.example.invalid',
      port: 587,
      tlsEnabled: true,
      fromName: 'Academy',
      fromEmail: 'sender@example.invalid',
    });
    prisma.emailQueue.updateMany.mockResolvedValue({ count: 1 });
    prisma.emailQueue.findUniqueOrThrow.mockResolvedValue({
      id: 'queue-1',
      recipient: 'form@example.invalid',
      subject: 'New registration',
      textContent: 'Test',
      event: 'MASTERCLASS_REGISTRATION',
      attempts: 1,
      maxAttempts: 3,
    });
    sendMail.mockResolvedValue({ messageId: 'smtp-1' });
    service = new EmailService(
      prisma as unknown as PrismaService,
      {} as EncryptionService,
    );
  });
  it('returns the SMTP error code and persists the diagnosis after a failed test', async () => {
    const logger = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    try {
      sendMail.mockRejectedValue(
        Object.assign(new Error('Invalid login'), { code: 'EAUTH' }),
      );
      await expect(service.sendTest('test@example.invalid')).rejects.toThrow(
        '[EAUTH] Invalid login',
      );
      const calls = prisma.emailProviderSetting.update.mock
        .calls as unknown as [{ data: { lastErrorMessage: string } }][];
      expect(calls[0][0].data.lastErrorMessage).toBe('[EAUTH] Invalid login');
    } finally {
      logger.mockRestore();
    }
  });
  it('explains a credential decryption failure without sending or exposing the encrypted value', async () => {
    const logger = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    try {
      const settings = (await prisma.emailProviderSetting.upsert()) as Record<
        string,
        unknown
      >;
      prisma.emailProviderSetting.upsert.mockResolvedValue({
        ...settings,
        usernameEncrypted: 'encrypted-test-value',
      });
      service = new EmailService(
        prisma as unknown as PrismaService,
        {
          decrypt: () => {
            throw new Error('Unsupported state or unable to authenticate data');
          },
        } as unknown as EncryptionService,
      );
      await expect(service.sendTest('test@example.invalid')).rejects.toThrow(
        'APP_ENCRYPTION_KEY',
      );
      expect(sendMail).not.toHaveBeenCalled();
      const calls = prisma.emailProviderSetting.update.mock
        .calls as unknown as [{ data: { lastErrorMessage: string } }][];
      expect(calls[0][0].data.lastErrorMessage).not.toContain(
        'encrypted-test-value',
      );
    } finally {
      logger.mockRestore();
    }
  });
  it('claims a pending notification atomically and sends it only once when cron races the immediate attempt', async () => {
    prisma.emailQueue.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    await Promise.all([
      service.processItem('queue-1'),
      service.processItem('queue-1'),
    ]);
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(prisma.emailQueue.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'queue-1',
        status: EmailQueueStatus.PENDING,
        nextAttemptAt: { lte: expect.any(Date) as Date },
      },
      data: { status: EmailQueueStatus.PROCESSING, attempts: { increment: 1 } },
    });
    expect(prisma.emailQueue.update).toHaveBeenCalledWith({
      where: { id: 'queue-1' },
      data: {
        status: EmailQueueStatus.SENT,
        sentAt: expect.any(Date) as Date,
        externalId: 'smtp-1',
      },
    });
  });
  it('keeps an SMTP failure queued for retry with an error visible to the admin', async () => {
    sendMail.mockRejectedValue(new Error('SMTP unavailable'));
    await service.processItem('queue-1');
    expect(prisma.emailQueue.update).toHaveBeenCalledWith({
      where: { id: 'queue-1' },
      data: {
        status: EmailQueueStatus.PENDING,
        errorMessage: 'SMTP unavailable',
        nextAttemptAt: expect.any(Date) as Date,
      },
    });
    expect(prisma.emailLog.create).not.toHaveBeenCalled();
  });
});
