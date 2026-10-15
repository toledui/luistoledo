import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { OrderStatus, Prisma } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PAID_COURSE, PAID_COURSE_WHATSAPP } from './paid-course.constants';
import { ListPaymentPlansDto } from './paid-course.dto';

type Tx = Prisma.TransactionClient;
type PaidOrder = {
  id: string;
  userId: string;
  number: string;
  paymentPlanId: string | null;
  installmentNumber: number | null;
  total: Prisma.Decimal;
};
const unpaid = [
  OrderStatus.PENDING,
  OrderStatus.AWAITING_PAYMENT,
  OrderStatus.FAILED,
];
const safe = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ]!,
  );
const money = (value: Prisma.Decimal | number) =>
  `$${Number(value).toLocaleString('es-MX')} MXN`;
const date = (value: Date) =>
  value.toLocaleString('es-MX', {
    timeZone: PAID_COURSE.timezone,
    dateStyle: 'long',
    timeStyle: 'short',
  });

@Injectable()
export class PaidCourseService {
  private readonly logger = new Logger(PaidCourseService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  publicOffer() {
    return {
      ...PAID_COURSE,
      registrationOpen:
        Date.now() <= new Date(PAID_COURSE.registrationClosesAt).getTime(),
    };
  }

  private frontUrl(path: string) {
    return `${this.config.get<string>('FRONTEND_URL', 'http://localhost:3000').replace(/\/$/, '')}${path}`;
  }
  private number() {
    return `LTA-${new Date().getFullYear()}-${randomBytes(6).toString('hex').toUpperCase()}`;
  }

  private async ensureCourse() {
    const existing = await this.prisma.course.findUnique({
      where: { id: PAID_COURSE.courseId },
    });
    if (existing) {
      if (existing.status !== 'PUBLISHED')
        throw new BadRequestException(
          'El curso no está disponible para inscripción',
        );
      return existing;
    }
    const owner = await this.prisma.user.findFirst({
      where: {
        status: 'ACTIVE',
        roles: { some: { role: { name: 'SUPER_ADMIN' } } },
      },
      select: { id: true },
    });
    if (!owner)
      throw new BadRequestException(
        'El curso aún no está configurado para recibir inscripciones',
      );
    return this.prisma.course.upsert({
      where: { id: PAID_COURSE.courseId },
      update: {},
      create: {
        id: PAID_COURSE.courseId,
        slug: PAID_COURSE.slug,
        title: PAID_COURSE.title,
        shortDescription:
          'Tres sábados de implementación en vivo: 21 y 28 de noviembre y 5 de diciembre de 2026, de 9:00 a 13:00, hora CDMX.',
        description:
          'Configura tu asistente, conéctalo con herramientas de trabajo y prueba una automatización empresarial.',
        status: 'PUBLISHED',
        isListed: false,
        price: PAID_COURSE.cashPrice,
        estimatedMinutes: 720,
        createdById: owner.id,
        instructorId: owner.id,
        publishedAt: new Date(),
      },
    });
  }

  private orderData(
    userId: string,
    planId: string,
    installment: number,
    amount: number | Prisma.Decimal,
    provider: 'STRIPE' | 'BANK_TRANSFER',
    dueAt: Date,
  ): Prisma.OrderCreateInput {
    const label =
      installment === 1 ? 'Inscripción' : `Parcialidad ${installment - 1} de 2`;
    return {
      number: this.number(),
      user: { connect: { id: userId } },
      paymentPlan: { connect: { id: planId } },
      installmentNumber: installment,
      status:
        provider === 'BANK_TRANSFER'
          ? OrderStatus.AWAITING_PAYMENT
          : OrderStatus.PENDING,
      currency: 'MXN',
      subtotal: amount,
      total: amount,
      dueAt,
      items: {
        create: {
          course: { connect: { id: PAID_COURSE.courseId } },
          title: `${PAID_COURSE.title} · ${label}`,
          unitPrice: amount,
          total: amount,
        },
      },
      payments: { create: { provider, amount, currency: 'MXN' } },
    };
  }

  async createInitialOrder(
    userId: string,
    option: 'FULL' | 'INSTALLMENTS',
    provider: 'STRIPE' | 'BANK_TRANSFER',
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { status: true },
    });
    if (!user || user.status !== 'ACTIVE')
      throw new BadRequestException('El alumno debe tener una cuenta activa');
    if (!this.publicOffer().registrationOpen)
      throw new BadRequestException(
        'Las inscripciones cerraron el 18 de noviembre de 2026, hora CDMX',
      );
    await this.ensureCourse();
    return this.prisma.$transaction(async (tx) => {
      const plan = await tx.coursePaymentPlan.upsert({
        where: { userId_courseId: { userId, courseId: PAID_COURSE.courseId } },
        update: {},
        create: {
          userId,
          courseId: PAID_COURSE.courseId,
          option,
          total:
            option === 'FULL'
              ? PAID_COURSE.cashPrice
              : PAID_COURSE.installmentTotal,
          initialAmount:
            option === 'FULL' ? PAID_COURSE.cashPrice : PAID_COURSE.deposit,
          installmentAmount:
            option === 'FULL' ? 0 : PAID_COURSE.installmentAmount,
        },
      });
      if (plan.activatedAt)
        throw new ConflictException(
          'Ya estás inscrito. Consulta tus pagos desde Mis pedidos.',
        );
      const existing = await tx.order.findUnique({
        where: {
          paymentPlanId_installmentNumber: {
            paymentPlanId: plan.id,
            installmentNumber: 1,
          },
        },
        include: { items: true, payments: true },
      });
      if (existing) {
        if (
          plan.option !== option ||
          existing.payments[0]?.provider !== provider
        )
          throw new ConflictException(
            'Ya tienes un pedido de inscripción pendiente. Continúalo desde Mis pedidos con el plan y método que elegiste.',
          );
        if (
          ![
            OrderStatus.PENDING,
            OrderStatus.AWAITING_PAYMENT,
            OrderStatus.FAILED,
          ].includes(existing.status as (typeof unpaid)[number])
        )
          throw new ConflictException(
            'Tu pedido no admite otro intento de pago. Contacta a soporte.',
          );
        if (existing.status === OrderStatus.FAILED)
          return tx.order.update({
            where: { id: existing.id },
            data: {
              status: provider === 'STRIPE' ? 'PENDING' : 'AWAITING_PAYMENT',
            },
            include: { items: true, payments: true },
          });
        return existing;
      }
      const enrolled = await tx.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId: PAID_COURSE.courseId } },
      });
      if (enrolled && ['ACTIVE', 'COMPLETED'].includes(enrolled.status))
        throw new ConflictException(
          'Ya tienes una inscripción activa en este curso',
        );
      return tx.order.create({
        data: this.orderData(
          userId,
          plan.id,
          1,
          plan.initialAmount,
          provider,
          new Date(PAID_COURSE.registrationClosesAt),
        ),
        include: { items: true, payments: true },
      });
    });
  }

  // Runs inside the same transaction that atomically claims a successful payment.
  async onPaid(tx: Tx, order: PaidOrder, provider: 'STRIPE' | 'BANK_TRANSFER') {
    if (!order.paymentPlanId) return;
    const plan = await tx.coursePaymentPlan.findUniqueOrThrow({
      where: { id: order.paymentPlanId },
    });
    if (order.installmentNumber === 1) {
      const activated = await tx.coursePaymentPlan.updateMany({
        where: { id: plan.id, activatedAt: null },
        data: {
          activatedAt: new Date(),
          lastReminderAt: new Date(),
          ...(plan.option === 'FULL' ? { completedAt: new Date() } : {}),
        },
      });
      if (!activated.count) return;
      if (plan.option === 'INSTALLMENTS') {
        for (const [
          index,
          dueAt,
        ] of PAID_COURSE.installmentDueDates.entries()) {
          await tx.order.create({
            data: this.orderData(
              order.userId,
              plan.id,
              index + 2,
              plan.installmentAmount,
              provider,
              new Date(dueAt),
            ),
          });
        }
      }
      await this.queueWelcome(tx, order, plan.option);
    } else {
      const pending = await tx.order.count({
        where: { paymentPlanId: plan.id, status: { in: unpaid } },
      });
      await tx.coursePaymentPlan.update({
        where: { id: plan.id },
        data: {
          lastReminderAt: new Date(),
          ...(!pending ? { completedAt: new Date() } : {}),
        },
      });
      const user = await tx.user.findUniqueOrThrow({
        where: { id: order.userId },
        select: { email: true, firstName: true },
      });
      const text = `Hola ${user.firstName}, recibimos tu pago de ${money(order.total)} para ${PAID_COURSE.title}. Pedido ${order.number}. ${pending ? 'Puedes consultar tus pagos restantes en tu panel.' : 'Tu curso está completamente pagado. ¡Gracias!'}\n${this.frontUrl('/mi-aprendizaje/pedidos')}`;
      await tx.emailQueue.create({
        data: {
          recipient: user.email,
          subject: 'Pago recibido · Curso de IA',
          textContent: text,
          htmlContent: `<p>${safe(text).replace(/\n/g, '<br>')}</p>`,
          event: 'PAID_COURSE_PAYMENT_RECEIVED',
          userId: order.userId,
          orderId: order.id,
          courseId: plan.courseId,
        },
      });
    }
  }

  private async queueWelcome(tx: Tx, order: PaidOrder, option: string) {
    const [user, contact, emailSettings, general] = await Promise.all([
      tx.user.findUniqueOrThrow({
        where: { id: order.userId },
        select: { firstName: true, lastName: true, email: true },
      }),
      tx.contactSetting.findUnique({ where: { id: 1 } }),
      tx.emailProviderSetting.findUnique({ where: { id: 1 } }),
      tx.generalSetting.findUnique({ where: { id: 1 } }),
    ]);
    const admin =
      contact?.recipientEmail ||
      emailSettings?.adminNotificationEmail ||
      general?.generalEmail ||
      general?.supportEmail;
    const orders = await tx.order.findMany({
      where: { paymentPlanId: order.paymentPlanId },
      orderBy: { installmentNumber: 'asc' },
    });
    const schedule = orders
      .filter((item) => item.installmentNumber !== 1)
      .map((item) => `${money(item.total)} · ${date(item.dueAt!)}`)
      .join('\n');
    const text = `Hola ${user.firstName}, tu inscripción a ${PAID_COURSE.title} está confirmada.\n\nRecibimos ${money(order.total)} (${option === 'FULL' ? 'pago de contado' : 'apartado'}).\nSesiones: 21 y 28 de noviembre y 5 de diciembre de 2026, de 9:00 a 13:00, hora de Ciudad de México.\n\nÚnete al grupo del curso: ${PAID_COURSE_WHATSAPP}\n\n${schedule ? `Pagos restantes:\n${schedule}\nRecibirás como máximo un correo de recordatorio por semana.\n\n` : ''}Consulta tus pedidos: ${this.frontUrl('/mi-aprendizaje/pedidos')}\nLos detalles de acceso a las sesiones se compartirán en el grupo. Servidor y consumo de IA se contratan por separado.`;
    await tx.emailQueue.create({
      data: {
        recipient: user.email,
        subject: '¡Tu inscripción al curso de IA está confirmada!',
        textContent: text,
        htmlContent: `<div style="font-family:Arial,sans-serif;line-height:1.7;max-width:640px;margin:auto"><h1>¡Bienvenido al curso!</h1><p>${safe(text).replace(/\n/g, '<br>')}</p><p><a href="${PAID_COURSE_WHATSAPP}">Unirme al grupo de WhatsApp</a></p><p><a href="${safe(this.frontUrl('/mi-aprendizaje/pedidos'))}">Ver mis pagos</a></p></div>`,
        event: 'PAID_COURSE_ENROLLED',
        userId: order.userId,
        orderId: order.id,
        courseId: PAID_COURSE.courseId,
      },
    });
    if (admin) {
      const notice = `Nueva inscripción confirmada a ${PAID_COURSE.title}\nAlumno: ${user.firstName} ${user.lastName}\nCorreo: ${user.email}\nPlan: ${option === 'FULL' ? 'Contado' : 'Parcialidades'}\nPago recibido: ${money(order.total)}\nPedido: ${order.number}\n${this.frontUrl('/admin/inscripciones-ia')}`;
      await tx.emailQueue.create({
        data: {
          recipient: admin,
          subject: 'Nueva inscripción pagada · Curso de asistente de IA',
          textContent: notice,
          htmlContent: `<p>${safe(notice).replace(/\n/g, '<br>')}</p>`,
          event: 'PAID_COURSE_ADMIN_NOTIFICATION',
          userId: order.userId,
          orderId: order.id,
          courseId: PAID_COURSE.courseId,
        },
      });
    } else
      this.logger.warn(
        'Inscripción confirmada sin destinatario administrativo configurado en Settings',
      );
  }

  @Cron('0 0 10 * * *', { timeZone: PAID_COURSE.timezone })
  async queueWeeklyReminders() {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const upcoming = new Date(now.getTime() + 7 * 86400000);
    const plans = await this.prisma.coursePaymentPlan.findMany({
      where: {
        courseId: PAID_COURSE.courseId,
        activatedAt: { not: null },
        completedAt: null,
        remindersEnabled: true,
        OR: [{ lastReminderAt: null }, { lastReminderAt: { lte: weekAgo } }],
        user: { status: 'ACTIVE' },
        orders: { some: { status: { in: unpaid }, dueAt: { lte: upcoming } } },
      },
      select: { id: true },
    });
    for (const plan of plans) {
      try {
        await this.prisma.$transaction(async (tx) => {
          const claimed = await tx.coursePaymentPlan.updateMany({
            where: {
              id: plan.id,
              completedAt: null,
              remindersEnabled: true,
              OR: [
                { lastReminderAt: null },
                { lastReminderAt: { lte: weekAgo } },
              ],
            },
            data: { lastReminderAt: now },
          });
          if (!claimed.count) return;
          const current = await tx.coursePaymentPlan.findUniqueOrThrow({
            where: { id: plan.id },
            include: {
              user: { select: { email: true, firstName: true } },
              orders: {
                where: { status: { in: unpaid } },
                orderBy: { dueAt: 'asc' },
              },
            },
          });
          if (!current.orders.length) return;
          const text = `Hola ${current.user.firstName}, este es tu resumen semanal de pagos pendientes de ${PAID_COURSE.title}.\n\n${current.orders.map((order) => `${order.number} · ${money(order.total)} · vence ${date(order.dueAt!)}`).join('\n')}\n\nPuedes consultar y pagar en ${this.frontUrl('/mi-aprendizaje/pedidos')}\nSi acabas de transferir, espera la confirmación del equipo. Recibirás como máximo un recordatorio por semana. Si necesitas ayuda o ajustar estos avisos, contáctanos desde tu panel.`;
          await tx.emailQueue.create({
            data: {
              recipient: current.user.email,
              subject: 'Tu resumen semanal de pagos · Curso de IA',
              textContent: text,
              htmlContent: `<p>${safe(text).replace(/\n/g, '<br>')}</p><p><a href="${safe(this.frontUrl('/mi-aprendizaje/pedidos'))}">Consultar y pagar</a></p>`,
              event: 'PAID_COURSE_PAYMENT_REMINDER',
              userId: current.userId,
              courseId: current.courseId,
            },
          });
        });
      } catch (error) {
        this.logger.error(
          `No se pudo preparar el recordatorio del plan ${plan.id}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }

  private planInclude() {
    return {
      user: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      orders: {
        orderBy: { installmentNumber: 'asc' as const },
        include: { payments: true },
      },
    };
  }
  async listPlans(query: ListPaymentPlansDto) {
    const where: Prisma.CoursePaymentPlanWhereInput = {
      courseId: PAID_COURSE.courseId,
      ...(query.option ? { option: query.option } : {}),
      ...(query.search
        ? {
            user: {
              OR: [
                { email: { contains: query.search } },
                { firstName: { contains: query.search } },
                { lastName: { contains: query.search } },
              ],
            },
          }
        : {}),
      ...(query.state === 'PENDING' ? { activatedAt: null } : {}),
      ...(query.state === 'ACTIVE'
        ? { activatedAt: { not: null }, completedAt: null }
        : {}),
      ...(query.state === 'COMPLETED' ? { completedAt: { not: null } } : {}),
      ...(query.state === 'OVERDUE'
        ? {
            activatedAt: { not: null },
            orders: {
              some: { status: { in: unpaid }, dueAt: { lt: new Date() } },
            },
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.coursePaymentPlan.findMany({
        where,
        include: this.planInclude(),
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.coursePaymentPlan.count({ where }),
    ]);
    return {
      items: items.map((plan) => ({
        ...plan,
        paid: plan.orders
          .filter((order) => order.status === 'PAID')
          .reduce((sum, order) => sum + Number(order.total), 0),
        balance: plan.orders
          .filter((order) =>
            unpaid.includes(order.status as (typeof unpaid)[number]),
          )
          .reduce((sum, order) => sum + Number(order.total), 0),
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.max(1, Math.ceil(total / query.limit)),
      },
    };
  }
  async getPlan(id: string) {
    const plan = await this.prisma.coursePaymentPlan.findFirst({
      where: { id, courseId: PAID_COURSE.courseId },
      include: this.planInclude(),
    });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    return plan;
  }
  async summary() {
    const where = {
      courseId: PAID_COURSE.courseId,
      activatedAt: { not: null },
    };
    const [registered, cash, installments, paid, pending, overdue] =
      await Promise.all([
        this.prisma.coursePaymentPlan.count({ where }),
        this.prisma.coursePaymentPlan.count({
          where: { ...where, option: 'FULL' },
        }),
        this.prisma.coursePaymentPlan.count({
          where: { ...where, option: 'INSTALLMENTS' },
        }),
        this.prisma.order.aggregate({
          where: {
            paymentPlan: { courseId: PAID_COURSE.courseId },
            status: 'PAID',
          },
          _sum: { total: true },
        }),
        this.prisma.order.aggregate({
          where: { paymentPlan: where, status: { in: unpaid } },
          _sum: { total: true },
        }),
        this.prisma.order.count({
          where: {
            paymentPlan: where,
            status: { in: unpaid },
            dueAt: { lt: new Date() },
          },
        }),
      ]);
    return {
      registered,
      cash,
      installments,
      collected: Number(paid._sum.total ?? 0),
      outstanding: Number(pending._sum.total ?? 0),
      overdueOrders: overdue,
    };
  }
  async setReminders(id: string, enabled: boolean, actorId: string) {
    await this.getPlan(id);
    return this.prisma.$transaction(async (tx) => {
      const plan = await tx.coursePaymentPlan.update({
        where: { id },
        data: { remindersEnabled: enabled },
      });
      await tx.settingAudit.create({
        data: {
          section: 'paid-course',
          action: 'REMINDERS_UPDATED',
          actorId,
          changes: { planId: id, remindersEnabled: enabled },
        },
      });
      return plan;
    });
  }
  async setUserReminders(userId: string, enabled: boolean) {
    const plan = await this.prisma.coursePaymentPlan.findUnique({
      where: { userId_courseId: { userId, courseId: PAID_COURSE.courseId } },
      select: { id: true },
    });
    if (!plan) throw new NotFoundException('No tienes un plan de este curso');
    return this.setReminders(plan.id, enabled, userId);
  }
}
