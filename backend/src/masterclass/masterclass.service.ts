import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ContactsService } from '../contacts/contacts.service';
import { EmailService } from '../email/email.service';
import { MASTERCLASS } from './masterclass.constants';
import { ListMasterclassDto, RegisterMasterclassDto } from './masterclass.dto';

const safe = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      })[character]!,
  );

@Injectable()
export class MasterclassService {
  private readonly logger = new Logger(MasterclassService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly contacts: ContactsService,
    private readonly email: EmailService,
  ) {}

  async publicSettings() {
    return {
      ...(await this.contacts.publicSettings()),
      title: MASTERCLASS.title,
      startsAt: MASTERCLASS.startsAt,
      registrationOpen: Date.now() < new Date(MASTERCLASS.startsAt).getTime(),
    };
  }

  private async recipient() {
    const [contact, general] = await Promise.all([
      this.prisma.contactSetting.findUnique({ where: { id: 1 } }),
      this.prisma.generalSetting.findUnique({ where: { id: 1 } }),
    ]);
    return (
      contact?.recipientEmail || general?.generalEmail || general?.supportEmail
    );
  }

  private notification(
    recipient: string,
    data: { name: string; email: string; whatsapp: string },
  ) {
    const text = `Nueva inscripción a ${MASTERCLASS.title}\n${MASTERCLASS.dateLabel}\n\nNombre: ${data.name}\nCorreo: ${data.email}\nWhatsApp: ${data.whatsapp}\n\nConsulta el registro en Admin > Masterclass.`;
    return {
      recipient,
      subject: 'Nueva inscripción · Masterclass de IA para negocios',
      textContent: text,
      htmlContent: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#17263b"><h1>Nueva inscripción a la masterclass</h1><h2>${MASTERCLASS.title}</h2><p>${MASTERCLASS.dateLabel}</p><hr><p><strong>Nombre:</strong> ${safe(data.name)}</p><p><strong>Correo:</strong> ${safe(data.email)}</p><p><strong>WhatsApp:</strong> ${safe(data.whatsapp)}</p><p><a href="https://wa.me/${data.whatsapp.replace(/\D/g, '')}">Contactar por WhatsApp</a></p><p>Consulta el registro en el panel administrativo, sección Masterclass.</p></div>`,
      event: 'MASTERCLASS_REGISTRATION',
    };
  }

  private confirmation(data: { name: string; email: string }) {
    const groupUrl = MASTERCLASS.whatsappGroupUrl;
    return {
      recipient: data.email,
      subject: '¡Tu lugar está confirmado! · Masterclass de IA para negocios',
      event: 'MASTERCLASS_CONFIRMATION',
      textContent: `Hola, ${data.name}.\n\n¡Tu registro está confirmado!\n${MASTERCLASS.title}\n${MASTERCLASS.dateLabel}\n90 minutos · Gratis · En línea\n\nÚnete al grupo de WhatsApp: ${groupUrl}\n\nEn el grupo compartiremos el enlace de acceso y los avisos de la masterclass. Abre la invitación y acepta unirte para recibirlos.\n\nAprenderás a crear contenido para tu negocio, dar seguimiento a tus clientes y ahorrar tiempo en tareas diarias.\n\nNos vemos en vivo,\nLuis Toledo · THagencia`,
      htmlContent: `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#eef2f6;font-family:Arial,Helvetica,sans-serif;color:#17263b"><div style="max-width:600px;margin:32px auto;background:#fff;border-radius:20px;overflow:hidden"><div style="padding:28px 32px;background:#07111f;color:#fff"><strong>Luis Toledo</strong><p style="margin:8px 0 0;color:#52e1ff;font-size:12px">MASTERCLASS GRATUITA · EN VIVO</p></div><div style="padding:32px"><p>Hola, ${safe(data.name)}.</p><h1 style="font-size:28px;line-height:1.2">¡Tu lugar está confirmado!</h1><p style="font-size:18px;font-weight:bold">${safe(MASTERCLASS.title)}</p><p style="line-height:1.7">${safe(MASTERCLASS.dateLabel)}<br>90 minutos · Gratis · En línea</p><div style="background:#edf9f2;border:1px solid #b8dfc8;border-radius:14px;padding:22px;margin:24px 0"><h2 style="margin:0;font-size:21px">Entra al grupo de WhatsApp</h2><p style="line-height:1.7">Ahí compartiremos el enlace de acceso y los avisos de la sesión. Abre la invitación y acepta unirte para recibirlos.</p><a href="${safe(groupUrl)}" style="display:inline-block;padding:15px 22px;background:#126d40;color:#fff;border-radius:10px;text-decoration:none;font-weight:bold">Unirme al grupo de WhatsApp</a></div><p style="line-height:1.7">Aprenderás a crear contenido para tu negocio, dar seguimiento a tus clientes y ahorrar tiempo en tareas diarias.</p><p style="font-size:12px;line-height:1.7;color:#657184">Si el botón no abre, copia este enlace en tu navegador:<br><a href="${safe(groupUrl)}" style="color:#08778e;word-break:break-all">${safe(groupUrl)}</a></p><p>Nos vemos en vivo,<br><strong>Luis Toledo · THagencia</strong></p></div></div></body></html>`,
    };
  }

  private async attemptNotification(id: string) {
    // Delivery failure must never discard an already saved registration.
    try {
      await this.email.processItem(id);
    } catch {
      this.logger.error(
        'No se pudo procesar el aviso de masterclass; permanece en la cola de correo.',
      );
    }
  }

  async register(dto: RegisterMasterclassDto, ip?: string) {
    if (Date.now() >= new Date(MASTERCLASS.startsAt).getTime())
      throw new BadRequestException(
        'El registro para esta masterclass ha cerrado.',
      );
    await this.contacts.verifyTurnstile(dto.turnstileToken, ip);
    const recipient = await this.recipient();
    try {
      const registration = await this.prisma.$transaction(async (tx) => {
        const queue = recipient
          ? await tx.emailQueue.create({
              data: this.notification(recipient, dto),
            })
          : null;
        const registration = await tx.masterclassRegistration.create({
          data: {
            eventKey: MASTERCLASS.key,
            name: dto.name,
            email: dto.email,
            whatsapp: dto.whatsapp,
            notificationQueueId: queue?.id,
          },
        });
        const confirmation = await tx.emailQueue.create({
          data: this.confirmation(dto),
        });
        return { ...registration, confirmationQueueId: confirmation.id };
      });
      await Promise.all([
        this.attemptNotification(registration.confirmationQueueId),
        ...(registration.notificationQueueId
          ? [this.attemptNotification(registration.notificationQueueId)]
          : []),
      ]);
      if (!registration.notificationQueueId)
        this.logger.warn(
          'Inscripción guardada sin aviso: configura el correo receptor de formularios.',
        );
    } catch (error) {
      // A repeated submission succeeds without duplicating a registration or notifying twice.
      if (!(
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ))
        throw error;
    }
    return { success: true, whatsappGroupUrl: MASTERCLASS.whatsappGroupUrl };
  }

  async list(query: ListMasterclassDto) {
    const search = query.search?.trim();
    const where: Prisma.MasterclassRegistrationWhereInput = {
      eventKey: query.eventKey ?? MASTERCLASS.key,
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { email: { contains: search } },
              { whatsapp: { contains: search } },
            ],
          }
        : {}),
    };
    const [items, total, recipient] = await Promise.all([
      this.prisma.masterclassRegistration.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          notification: {
            select: {
              status: true,
              sentAt: true,
              errorMessage: true,
              recipient: true,
            },
          },
        },
      }),
      this.prisma.masterclassRegistration.count({ where }),
      this.recipient(),
    ]);
    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
      recipientConfigured: Boolean(recipient),
      eventKey: query.eventKey ?? MASTERCLASS.key,
      event:
        !query.eventKey || query.eventKey === MASTERCLASS.key
          ? MASTERCLASS
          : null,
    };
  }

  async retryNotification(id: string) {
    const recipient = await this.recipient();
    if (!recipient)
      throw new BadRequestException(
        'Configura primero el correo receptor en Configuración > Contacto.',
      );
    const queueId = await this.prisma.$transaction(async (tx) => {
      const registration = await tx.masterclassRegistration.findUnique({
        where: { id },
        include: { notification: true },
      });
      if (!registration || registration.eventKey !== MASTERCLASS.key)
        throw new NotFoundException('Registro no encontrado');
      if (
        registration.notification?.status === 'SENT' ||
        registration.notification?.status === 'PROCESSING'
      )
        throw new BadRequestException(
          'El aviso ya fue enviado o está en proceso.',
        );
      if (registration.notificationQueueId) {
        const claimed = await tx.emailQueue.updateMany({
          where: {
            id: registration.notificationQueueId,
            status: { in: ['PENDING', 'FAILED', 'CANCELLED'] },
          },
          data: {
            recipient,
            status: 'PENDING',
            attempts: 0,
            nextAttemptAt: new Date(),
            errorMessage: null,
          },
        });
        if (!claimed.count)
          throw new BadRequestException('El aviso está en proceso.');
        return registration.notificationQueueId;
      }
      const queue = await tx.emailQueue.create({
        data: this.notification(recipient, registration),
      });
      const linked = await tx.masterclassRegistration.updateMany({
        where: { id, notificationQueueId: null },
        data: { notificationQueueId: queue.id },
      });
      if (!linked.count)
        throw new BadRequestException(
          'Ya se creó un aviso. Actualiza la lista.',
        );
      return queue.id;
    });
    await this.attemptNotification(queueId);
    return { success: true };
  }
}
