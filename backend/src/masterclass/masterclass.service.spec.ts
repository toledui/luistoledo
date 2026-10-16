import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ContactsService } from '../contacts/contacts.service';
import { EmailService } from '../email/email.service';
import { MasterclassService } from './masterclass.service';
import { RegisterMasterclassDto } from './masterclass.dto';
import { MASTERCLASS } from './masterclass.constants';

describe('Masterclass registrations', () => {
  const prisma = {
    contactSetting: { findUnique: jest.fn() },
    generalSetting: { findUnique: jest.fn() },
    emailQueue: { create: jest.fn() },
    masterclassRegistration: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  const contacts = { verifyTurnstile: jest.fn() };
  const email = { processItem: jest.fn() };
  let service: MasterclassService;
  const dto = {
    name: 'Ana <Prueba>',
    email: 'ana@example.com',
    whatsapp: '+525512345678',
    consent: true,
  };
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-15T12:00:00Z'));
    jest.resetAllMocks();
    prisma.contactSetting.findUnique.mockResolvedValue({
      recipientEmail: 'formularios@example.com',
    });
    prisma.generalSetting.findUnique.mockResolvedValue({
      generalEmail: 'general@example.com',
    });
    prisma.emailQueue.create.mockImplementation(
      ({ data }: { data: { event: string } }) =>
        Promise.resolve({
          id:
            data.event === 'MASTERCLASS_CONFIRMATION'
              ? 'confirmation-1'
              : 'queue-1',
        }),
    );
    prisma.masterclassRegistration.create.mockResolvedValue({
      id: 'registration-1',
      notificationQueueId: 'queue-1',
    });
    prisma.$transaction.mockImplementation(
      (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );
    service = new MasterclassService(
      prisma as unknown as PrismaService,
      contacts as unknown as ContactsService,
      email as unknown as EmailService,
    );
  });
  afterEach(() => jest.useRealTimers());
  it('saves registration and durable notification together, then immediately attempts delivery to the form recipient', async () => {
    await expect(service.register(dto, '127.0.0.1')).resolves.toEqual({
      success: true,
      whatsappGroupUrl: MASTERCLASS.whatsappGroupUrl,
    });
    expect(contacts.verifyTurnstile).toHaveBeenCalledWith(
      undefined,
      '127.0.0.1',
    );
    const queueCalls = prisma.emailQueue.create.mock.calls as unknown as [
      { data: { recipient: string; htmlContent: string } },
    ][];
    const data = queueCalls[0][0].data;
    expect(data.recipient).toBe('formularios@example.com');
    expect(data.htmlContent).toContain('Ana &lt;Prueba&gt;');
    expect(email.processItem).toHaveBeenCalledWith('queue-1');
    expect(email.processItem).toHaveBeenCalledWith('confirmation-1');
    const registrationCalls = prisma.masterclassRegistration.create.mock
      .calls as unknown as [{ data: Record<string, unknown> }][];
    expect(registrationCalls[0][0].data).toMatchObject({
      notificationQueueId: 'queue-1',
      whatsapp: dto.whatsapp,
      eventKey: MASTERCLASS.key,
    });
  });
  it('emails the participant a confirmation with the date and WhatsApp invitation, without sales messaging', async () => {
    await service.register(dto);
    const calls = prisma.emailQueue.create.mock.calls as unknown as [
      {
        data: {
          event: string;
          recipient: string;
          subject: string;
          htmlContent: string;
          textContent: string;
        };
      },
    ][];
    const confirmation = calls.find(
      ([call]) => call.data.event === 'MASTERCLASS_CONFIRMATION',
    )![0].data;
    expect(confirmation.recipient).toBe(dto.email);
    expect(confirmation.subject).toContain('Tu lugar está confirmado');
    expect(confirmation.textContent).toContain(MASTERCLASS.dateLabel);
    expect(confirmation.textContent).toContain(MASTERCLASS.whatsappGroupUrl);
    expect(confirmation.htmlContent).toContain(
      `href="${MASTERCLASS.whatsappGroupUrl}"`,
    );
    expect(confirmation.htmlContent).toContain('Ana &lt;Prueba&gt;');
    expect(confirmation.textContent).not.toMatch(/taller|de pago|comprar/i);
    expect(email.processItem).toHaveBeenCalledTimes(2);
  });
  it('sends the participant confirmation even when no admin recipient is configured', async () => {
    prisma.contactSetting.findUnique.mockResolvedValue(null);
    prisma.generalSetting.findUnique.mockResolvedValue(null);
    prisma.masterclassRegistration.create.mockResolvedValue({
      id: 'registration-1',
      notificationQueueId: null,
    });
    await expect(service.register(dto)).resolves.toHaveProperty(
      'success',
      true,
    );
    expect(prisma.emailQueue.create).toHaveBeenCalledTimes(1);
    expect(email.processItem).toHaveBeenCalledWith('confirmation-1');
  });
  it('retains a successful registration if immediate email processing fails', async () => {
    email.processItem.mockRejectedValue(new Error('SMTP unavailable'));
    await expect(service.register(dto)).resolves.toHaveProperty(
      'success',
      true,
    );
  });
  it('handles repeated submissions without notifying twice', async () => {
    prisma.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: '7.8.0',
      }),
    );
    await expect(service.register(dto)).resolves.toHaveProperty(
      'success',
      true,
    );
    expect(email.processItem).not.toHaveBeenCalled();
  });
  it('does not register or send when anti-spam verification fails', async () => {
    contacts.verifyTurnstile.mockRejectedValue(
      new BadRequestException('Invalid captcha'),
    );
    await expect(service.register(dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('does not confirm if the database fails', async () => {
    prisma.$transaction.mockRejectedValue(new Error('database unavailable'));
    await expect(service.register(dto)).rejects.toThrow('database unavailable');
    expect(email.processItem).not.toHaveBeenCalled();
  });
  it('closes registrations at the event start time', async () => {
    jest.setSystemTime(new Date(MASTERCLASS.startsAt));
    await expect(service.register(dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('normalizes email and WhatsApp and requires consent', async () => {
    const valid = plainToInstance(RegisterMasterclassDto, {
      ...dto,
      email: ' ANA@example.com ',
      whatsapp: '+52 (55) 1234-5678',
    });
    expect(await validate(valid)).toHaveLength(0);
    expect(valid.email).toBe('ana@example.com');
    expect(valid.whatsapp).toBe('+525512345678');
    expect(
      await validate(
        plainToInstance(RegisterMasterclassDto, {
          ...dto,
          whatsapp: '5512345678',
          consent: false,
        }),
      ),
    ).toHaveLength(1);
  });
  it.each([
    ['5512345678', '+525512345678'],
    ['55 1234 5678', '+525512345678'],
    ['(55) 1234-5678', '+525512345678'],
    ['525512345678', '+525512345678'],
    ['+52 (55) 1234-5678', '+525512345678'],
    ['1 (415) 555-2671', '+14155552671'],
    ['+34 612.345.678', '+34612345678'],
  ])('accepts WhatsApp %s and stores %s', async (whatsapp, expected) => {
    const valid = plainToInstance(RegisterMasterclassDto, { ...dto, whatsapp });
    expect(await validate(valid)).toHaveLength(0);
    expect(valid.whatsapp).toBe(expected);
    await service.register(valid);
    const calls = prisma.masterclassRegistration.create.mock
      .calls as unknown as [{ data: { whatsapp: string } }][];
    expect(calls[0][0].data.whatsapp).toBe(expected);
  });
  it.each([
    '',
    '551234567',
    '+5255123456789012',
    '551234abcd',
    '++525512345678',
  ])('rejects incomplete or invalid WhatsApp %s', async (whatsapp) => {
    const invalid = plainToInstance(RegisterMasterclassDto, {
      ...dto,
      whatsapp,
    });
    expect((await validate(invalid)).map((error) => error.property)).toContain(
      'whatsapp',
    );
  });
});
