import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EmailProvider, EmailQueueStatus } from '@prisma/client';
import nodemailer from 'nodemailer';
import { EncryptionService } from '../crypto/encryption.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateEmailSettingsDto } from './dto/update-email-settings.dto';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private processing = false;
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  private settings() {
    return this.prisma.emailProviderSetting.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    });
  }

  async getSettings() {
    const value = await this.settings();
    const { usernameEncrypted, passwordEncrypted, ...safe } = value;
    return {
      ...safe,
      usernameConfigured: Boolean(usernameEncrypted),
      passwordConfigured: Boolean(passwordEncrypted),
      secretPreview: '••••••••',
    };
  }

  async updateSettings(
    dto: UpdateEmailSettingsDto,
    actor?: { id: string; email: string },
    ipAddress?: string,
  ) {
    const { username, password, ...data } = dto;
    const encrypted = {
      ...(username
        ? { usernameEncrypted: this.encryption.encrypt(username) }
        : {}),
      ...(password
        ? { passwordEncrypted: this.encryption.encrypt(password) }
        : {}),
    };
    await this.prisma.$transaction([
      this.prisma.emailProviderSetting.upsert({
        where: { id: 1 },
        update: { ...data, ...encrypted },
        create: { id: 1, ...data, ...encrypted },
      }),
      this.prisma.settingAudit.create({
        data: {
          section: 'email',
          action: 'UPDATE',
          actorId: actor?.id,
          actorEmail: actor?.email,
          ipAddress,
          changes: {
            ...data,
            usernameConfigured: Boolean(username),
            passwordConfigured: Boolean(password),
          },
        },
      }),
    ]);
    return this.getSettings();
  }

  private async transporter() {
    const settings = await this.settings();
    if (!settings.enabled || settings.provider === EmailProvider.DISABLED)
      throw new ServiceUnavailableException(
        'El servicio de correo está desactivado',
      );
    if (settings.provider === EmailProvider.LOG) return null;
    if (!settings.host)
      throw new ServiceUnavailableException('El host SMTP no está configurado');
    let user: string | undefined;
    let pass: string | undefined;
    try {
      user = settings.usernameEncrypted
        ? this.encryption.decrypt(settings.usernameEncrypted)
        : undefined;
      pass = settings.passwordEncrypted
        ? this.encryption.decrypt(settings.passwordEncrypted)
        : undefined;
    } catch {
      throw new ServiceUnavailableException(
        'No se pudieron descifrar las credenciales SMTP. Verifica que APP_ENCRYPTION_KEY sea la misma con la que se guardaron; no la regeneres. Si la clave original no se puede recuperar, vuelve a guardar el usuario y la contraseña SMTP con la clave vigente.',
      );
    }
    return nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.sslEnabled,
      auth: user && pass ? { user, pass } : undefined,
      connectionTimeout: settings.timeoutMs,
      greetingTimeout: settings.timeoutMs,
      tls: settings.tlsEnabled ? { minVersion: 'TLSv1.2' } : undefined,
    });
  }

  async sendTest(recipient: string) {
    const settings = await this.settings();
    const started = new Date();
    try {
      const transport = await this.transporter();
      const subject = 'Correo de prueba · Luis Toledo Academy';
      let externalId = `log-${Date.now()}`;
      if (transport) {
        const result = await transport.sendMail({
          from: { name: settings.fromName, address: settings.fromEmail },
          to: recipient,
          replyTo: settings.replyToEmail ?? undefined,
          subject,
          text: 'La configuración de correo funciona correctamente.',
          html: '<h1>Configuración correcta</h1><p>Luis Toledo Academy puede enviar correos.</p>',
        });
        externalId = result.messageId;
      }
      await this.prisma.emailLog.create({
        data: {
          recipient,
          subject,
          event: 'EMAIL_TEST',
          status: EmailQueueStatus.SENT,
          provider: settings.provider,
          externalId,
          sentAt: new Date(),
        },
      });
      await this.prisma.emailProviderSetting.update({
        where: { id: 1 },
        data: {
          lastTestedAt: started,
          lastSuccessAt: new Date(),
          lastErrorMessage: null,
        },
      });
      return {
        success: true,
        provider: settings.provider,
        message:
          settings.provider === EmailProvider.LOG
            ? 'Correo registrado en modo log.'
            : 'Correo enviado correctamente.',
      };
    } catch (error: unknown) {
      const code =
        error &&
        typeof error === 'object' &&
        'code' in error &&
        typeof error.code === 'string' &&
        /^[A-Z0-9_]+$/.test(error.code)
          ? error.code
          : undefined;
      const detail =
        error instanceof Error ? error.message : 'Error desconocido';
      const message = `${code ? `[${code}] ` : ''}${detail}`.slice(0, 500);
      this.logger.error(
        `Falló la prueba de correo (${code || 'sin código SMTP'}). Consulta lastErrorMessage en Configuración > Correo.`,
      );
      await this.prisma.emailProviderSetting.update({
        where: { id: 1 },
        data: {
          lastTestedAt: started,
          lastErrorAt: new Date(),
          lastErrorMessage: message,
        },
      });
      throw new ServiceUnavailableException(message);
    }
  }

  async sendRendered(
    recipient: string,
    subject: string,
    html: string,
    text: string,
    event: string,
    attachments?: { filename: string; path: string; contentType?: string }[],
  ) {
    const settings = await this.settings();
    const transport = await this.transporter();
    const result = transport
      ? await transport.sendMail({
          from: { name: settings.fromName, address: settings.fromEmail },
          to: recipient,
          replyTo: settings.replyToEmail ?? undefined,
          subject,
          html,
          text,
          attachments,
        })
      : { messageId: `log-${Date.now()}` };
    await this.prisma.emailLog.create({
      data: {
        recipient,
        subject,
        event,
        status: EmailQueueStatus.SENT,
        provider: settings.provider,
        externalId: result.messageId,
        sentAt: new Date(),
      },
    });
    return { success: true, provider: settings.provider };
  }

  async status() {
    const settings = await this.settings();
    const [sentToday, failed, pending] = await Promise.all([
      this.prisma.emailLog.count({
        where: {
          status: EmailQueueStatus.SENT,
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      this.prisma.emailLog.count({
        where: { status: EmailQueueStatus.FAILED },
      }),
      this.prisma.emailQueue.count({
        where: { status: EmailQueueStatus.PENDING },
      }),
    ]);
    return {
      provider: settings.provider,
      enabled: settings.enabled,
      configured:
        settings.provider === EmailProvider.LOG || Boolean(settings.host),
      lastTestedAt: settings.lastTestedAt,
      lastSuccessAt: settings.lastSuccessAt,
      lastErrorAt: settings.lastErrorAt,
      lastErrorMessage: settings.lastErrorMessage,
      sentToday,
      failed,
      pending,
    };
  }

  logs() {
    return this.prisma.emailLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
  queue() {
    return this.prisma.emailQueue.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  @Cron('*/30 * * * * *')
  async processQueue() {
    if (this.processing) return;
    this.processing = true;
    try {
      const pending = await this.prisma.emailQueue.findMany({
        where: {
          status: EmailQueueStatus.PENDING,
          nextAttemptAt: { lte: new Date() },
        },
        take: 10,
      });
      for (const item of pending) await this.processItem(item.id);
    } finally {
      this.processing = false;
    }
  }

  async processItem(id: string) {
    // Atomically claim the item so the immediate attempt and cron cannot both send it.
    const claimed = await this.prisma.emailQueue.updateMany({
      where: {
        id,
        status: EmailQueueStatus.PENDING,
        nextAttemptAt: { lte: new Date() },
      },
      data: { status: EmailQueueStatus.PROCESSING, attempts: { increment: 1 } },
    });
    if (!claimed.count) return;
    const item = await this.prisma.emailQueue.findUniqueOrThrow({
      where: { id },
    });
    try {
      if (item.event === 'PAID_COURSE_PAYMENT_REMINDER') {
        const plan = await this.prisma.coursePaymentPlan.findFirst({
          where: {
            userId: item.userId ?? '',
            courseId: item.courseId ?? '',
            activatedAt: { not: null },
            completedAt: null,
            remindersEnabled: true,
            orders: {
              some: {
                status: { in: ['PENDING', 'AWAITING_PAYMENT', 'FAILED'] },
              },
            },
          },
        });
        // Do not deliver a queued reminder after payment or after the student pauses it.
        if (
          !plan ||
          (plan.lastReminderAt && plan.lastReminderAt > item.createdAt)
        ) {
          await this.prisma.emailQueue.update({
            where: { id },
            data: { status: EmailQueueStatus.CANCELLED },
          });
          return;
        }
      }
      const settings = await this.settings();
      const transport = await this.transporter();
      const result = transport
        ? await transport.sendMail({
            from: { name: settings.fromName, address: settings.fromEmail },
            to: item.recipient,
            subject: item.subject,
            text: item.textContent,
            html: item.htmlContent ?? undefined,
          })
        : { messageId: `log-${Date.now()}` };
      await this.prisma.emailQueue.update({
        where: { id },
        data: {
          status: EmailQueueStatus.SENT,
          sentAt: new Date(),
          externalId: result.messageId,
        },
      });
      await this.prisma.emailLog.create({
        data: {
          queueId: id,
          recipient: item.recipient,
          subject: item.subject,
          event: item.event,
          status: EmailQueueStatus.SENT,
          provider: settings.provider,
          attempts: item.attempts,
          externalId: result.messageId,
          sentAt: new Date(),
        },
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message.slice(0, 500)
          : 'Error desconocido';
      const failed = item.attempts >= item.maxAttempts;
      await this.prisma.emailQueue.update({
        where: { id },
        data: {
          status: failed ? EmailQueueStatus.FAILED : EmailQueueStatus.PENDING,
          errorMessage: message,
          nextAttemptAt: new Date(Date.now() + 2 ** item.attempts * 60_000),
        },
      });
    }
  }
}
