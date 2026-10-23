import { SendcorexService } from '../sendcorex/sendcorex.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  CourseStatus,
  EnrollmentStatus,
  OrderStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import Stripe from 'stripe';
import { EncryptionService } from '../crypto/encryption.service';
import { checkEnvironmentKey } from '../crypto/secrets-check';
import { EmailTemplateService } from '../email-templates/email-template.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCouponDto, UpdatePaymentSettingsDto } from './dto/sales.dto';
import { ListOrdersDto } from './dto/list-orders.dto';
import { PaidCourseService } from '../paid-course/paid-course.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { CurrenciesService } from './currencies.service';

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly config: ConfigService,
    private readonly emailTemplates: EmailTemplateService,
    private readonly paidCourse: PaidCourseService,
    @Optional() private readonly analytics?: AnalyticsService,
    @Optional() private readonly sendcorex?: SendcorexService,
    @Optional() private readonly currencies?: CurrenciesService,
  ) {}

  private orderInclude() {
    return {
      user: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      items: true,
      payments: true,
      paymentPlan: true,
    } as const;
  }

  async adminOrder(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: this.orderInclude(),
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    return order;
  }

  async searchOrders(query: ListOrdersDto) {
    const where: Prisma.OrderWhereInput = {
      ...(query.paymentPlanId ? { paymentPlanId: query.paymentPlanId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.search
        ? {
            OR: [
              { number: { contains: query.search } },
              { user: { email: { contains: query.search } } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: this.orderInclude(),
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.order.count({ where }),
    ]);
    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.max(1, Math.ceil(total / query.limit)),
      },
    };
  }

  private async sendPurchaseEmails(
    userId: string,
    order: {
      number: string;
      total: Prisma.Decimal;
      items: { title: string; courseId: string }[];
    },
    paid: boolean,
  ) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const values = {
      student_name: user.firstName,
      student_email: user.email,
      order_number: order.number,
      order_total: `$${Number(order.total).toLocaleString('es-MX')} MXN`,
      course_name: order.items.map((item) => item.title).join(', '),
      course_url: `${this.config.get('FRONTEND_URL', 'http://localhost:3000')}/mi-aprendizaje`,
    };
    await this.emailTemplates.sendEvent(
      paid ? 'PAYMENT_APPROVED' : 'ORDER_RECEIVED',
      user.email,
      values,
    );
    if (paid)
      await this.emailTemplates.sendEvent(
        'COURSE_ENROLLED',
        user.email,
        values,
      );
  }

  private paymentSettingsRecord() {
    return this.prisma.paymentProviderSetting.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    });
  }

  async paymentSettings() {
    const value = await this.paymentSettingsRecord();
    return {
      stripeEnabled: value.stripeEnabled,
      stripeMode: value.stripeMode,
      stripePublishableKey: value.stripePublishableKey,
      stripeSecretConfigured: Boolean(value.stripeSecretKeyEncrypted),
      stripeWebhookConfigured: Boolean(value.stripeWebhookSecretEncrypted),
      bankTransferEnabled: value.bankTransferEnabled,
      bankName: value.bankName,
      bankBeneficiary: value.bankBeneficiary,
      bankAccount: value.bankAccount,
      bankClabe: value.bankClabe,
      bankInstructions: value.bankInstructions,
      paymentDeadlineHours: value.paymentDeadlineHours,
      currency: value.currency,
    };
  }

  async updatePaymentSettings(dto: UpdatePaymentSettingsDto) {
    const secretKey = dto.stripeSecretKey?.trim();
    const webhookSecret = dto.stripeWebhookSecret?.trim();
    if (secretKey || webhookSecret) {
      try {
        checkEnvironmentKey(
          this.config.getOrThrow<string>('APP_ENCRYPTION_KEY'),
        );
      } catch {
        throw new ServiceUnavailableException(
          'No se guardaron las claves: la clave de cifrado del proceso no coincide con backend/.env o no se pudo verificar. Revisa la configuración de PM2 y reinicia el backend antes de volver a guardar.',
        );
      }
    }
    this.currencies?.reset();
    await this.paymentSettingsRecord();
    const updated = await this.prisma.paymentProviderSetting.update({
      where: { id: 1 },
      data: {
        stripeEnabled: dto.stripeEnabled,
        stripeMode: dto.stripeMode,
        stripePublishableKey: dto.stripePublishableKey?.trim() || null,
        ...(secretKey
          ? { stripeSecretKeyEncrypted: this.encryption.encrypt(secretKey) }
          : {}),
        ...(webhookSecret
          ? {
              stripeWebhookSecretEncrypted:
                this.encryption.encrypt(webhookSecret),
            }
          : {}),
        bankTransferEnabled: dto.bankTransferEnabled,
        bankName: dto.bankName || null,
        bankBeneficiary: dto.bankBeneficiary || null,
        bankAccount: dto.bankAccount || null,
        bankClabe: dto.bankClabe || null,
        bankInstructions: dto.bankInstructions || null,
        paymentDeadlineHours: dto.paymentDeadlineHours,
      },
    });
    return {
      ...(await this.paymentSettings()),
      stripeSecretConfigured: Boolean(updated.stripeSecretKeyEncrypted),
      stripeWebhookConfigured: Boolean(updated.stripeWebhookSecretEncrypted),
    };
  }

  private async stripeClient() {
    const settings = await this.paymentSettingsRecord();
    if (!settings.stripeEnabled || !settings.stripeSecretKeyEncrypted)
      throw new BadRequestException('Stripe no está configurado');
    const key = this.decryptStripeSecret(settings.stripeSecretKeyEncrypted);
    const mode = settings.stripeMode === 'LIVE' ? 'live' : 'test';
    if (!key.startsWith(`sk_${mode}_`) && !key.startsWith(`rk_${mode}_`))
      throw new BadRequestException(
        'La clave secreta no corresponde al modo configurado de Stripe',
      );
    return {
      client: new Stripe(key, { timeout: 5000, maxNetworkRetries: 0 }),
      settings,
    };
  }

  private decryptStripeSecret(value: string) {
    try {
      return this.encryption.decrypt(value).trim();
    } catch {
      this.logger.error(
        'No se pudo descifrar una credencial de Stripe. Revisa APP_ENCRYPTION_KEY y ejecuta npm run secrets:check; recupera la clave original o vuelve a guardar la credencial en Configuración > Pagos.',
      );
      throw new ServiceUnavailableException(
        'El servicio de pagos no está disponible temporalmente. Intenta más tarde.',
      );
    }
  }

  private async createStripeCheckoutSession(
    order: {
      id: string;
      userId: string;
      currency: string;
      total: Prisma.Decimal;
      items: { title: string }[];
    },
    cancelPath: string,
    stripeClient?: Stripe,
    currencyQuote?: string,
  ) {
    const client = stripeClient ?? (await this.stripeClient()).client;
    const frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const quoted = currencyQuote
      ? this.currencies?.verify(currencyQuote, order.total)
      : undefined;
    if (currencyQuote && !quoted)
      throw new BadRequestException('No fue posible validar la cotización.');
    // Serialize session replacement for this order, including competing currency changes.
    // The payment URL is returned only after the expected charge has been committed.
    return this.prisma.$transaction(
      async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: { updatedAt: new Date() },
        });
        const current = await tx.order.findUniqueOrThrow({
          where: { id: order.id },
          include: { payments: true },
        });
        if (
          current.userId !== order.userId ||
          ![OrderStatus.PENDING, OrderStatus.FAILED].includes(
            current.status as 'PENDING' | 'FAILED',
          )
        )
          throw new BadRequestException(
            'Este pedido no admite iniciar otro pago.',
          );
        const pending = current.payments.find(
          (p) => p.provider === 'STRIPE' && p.status === PaymentStatus.PENDING,
        );
        if (!current.total.equals(order.total))
          throw new BadRequestException(
            'El importe del pedido cambió. Revisa tu cotización.',
          );
        if (!pending)
          throw new BadRequestException('El pago pendiente no existe.');
        const currency =
          quoted?.currency ?? pending.checkoutCurrency ?? order.currency;
        const amount =
          quoted?.amount ??
          (pending.checkoutAmount != null
            ? Number(pending.checkoutAmount)
            : Math.round(Number(order.total) * 100));
        if (pending.externalId) {
          const previous = await client.checkout.sessions.retrieve(
            pending.externalId,
          );
          this.assertStripeSession(
            { ...order, payments: current.payments },
            previous,
          );
          if (previous.status === 'complete') {
            if (previous.payment_status === 'paid')
              return `${frontendUrl}/checkout/exito?order=${order.id}&session_id=${previous.id}`;
            throw new BadRequestException(
              'Stripe está procesando el pago. Espera su confirmación.',
            );
          }
          if (previous.status === 'open') {
            if (
              previous.url &&
              previous.currency?.toUpperCase() === currency &&
              previous.amount_total === amount &&
              (!quoted || previous.adaptive_pricing?.enabled === false)
            )
              return previous.url;
            const expired = await client.checkout.sessions.expire(previous.id);
            if (expired.status !== 'expired')
              throw new BadRequestException(
                'No fue posible cerrar el pago anterior.',
              );
          }
        }
        const session = await client.checkout.sessions.create(
          {
            mode: 'payment',
            adaptive_pricing: { enabled: !quoted && !pending.checkoutCurrency },
            client_reference_id: order.id,
            metadata: { orderId: order.id, userId: order.userId },
            line_items: [
              {
                quantity: 1,
                price_data: {
                  currency: currency.toLowerCase(),
                  unit_amount: amount,
                  product_data: {
                    name:
                      order.items.length === 1
                        ? order.items[0].title
                        : `${order.items.length} cursos · Luis Toledo Academy`,
                  },
                },
              },
            ],
            success_url: `${frontendUrl}/checkout/exito?order=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${frontendUrl}${cancelPath}`,
            ...(quoted
              ? {
                  custom_text: {
                    submit: {
                      message: `Cobro en ${currency}. Para elegir otra moneda, usa Volver y cámbiala en el sitio antes de pagar.`,
                    },
                  },
                }
              : {}),
          },
          {
            idempotencyKey: `lta-${order.id}-${pending.externalId ?? 'initial'}-${currency}-${amount}`,
            timeout: 5000,
            maxNetworkRetries: 0,
          },
        );
        if (!session.url)
          throw new BadRequestException('Stripe no devolvió una URL de pago');
        const bound = await tx.payment.updateMany({
          where: {
            orderId: order.id,
            provider: 'STRIPE',
            status: PaymentStatus.PENDING,
          },
          data: {
            externalId: session.id,
            checkoutCurrency: currency,
            checkoutAmount: amount,
            checkoutRate: quoted?.rate ?? pending.checkoutRate ?? 1,
            checkoutRateAt: quoted
              ? new Date(quoted.at)
              : (pending.checkoutRateAt ?? new Date()),
          },
        });
        if (!bound.count)
          throw new BadRequestException(
            'No fue posible vincular el pago a este pedido.',
          );
        return session.url;
      },
      { timeout: 25000, maxWait: 5000 },
    );
  }

  async currencyOptions(ip?: string) {
    try {
      if (!this.currencies) throw new Error();
      const { client } = await this.stripeClient();
      return await this.currencies.options(client, ip);
    } catch {
      return {
        currencies: ['MXN'],
        defaultCurrency: 'MXN',
        country: null,
        rateUpdatedAt: null,
        unavailable: true,
      };
    }
  }
  async currencyQuote(amountMxn: number, currency: string) {
    if (!this.currencies)
      throw new BadRequestException('La conversión no está disponible.');
    const client =
      currency === 'MXN' ? undefined : (await this.stripeClient()).client;
    return this.currencies.quote(amountMxn, currency, client);
  }

  private assertStripeSession(
    order: {
      id: string;
      userId: string;
      currency: string;
      total: Prisma.Decimal;
      payments?: {
        externalId: string | null;
        checkoutCurrency?: string | null;
        checkoutAmount?: Prisma.Decimal | null;
      }[];
    },
    session: Stripe.Checkout.Session,
  ) {
    // Adaptive Pricing retains integration amounts in these fields. Local amounts are in presentment_details.
    const payment = order.payments?.find((p) => p.externalId === session.id);
    const expectedCurrency = payment?.checkoutCurrency ?? order.currency;
    const expectedAmount =
      payment?.checkoutAmount != null
        ? Number(payment.checkoutAmount)
        : Math.round(Number(order.total) * 100);
    if (
      session.metadata?.orderId !== order.id ||
      session.metadata?.userId !== order.userId ||
      session.client_reference_id !== order.id ||
      session.currency?.toUpperCase() !== expectedCurrency.toUpperCase() ||
      session.amount_total !== expectedAmount
    )
      throw new BadRequestException(
        'Los datos del pago de Stripe no coinciden',
      );
  }

  private cartRecord(userId: string) {
    return this.prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
          include: { course: { include: { coverMedia: true } } },
        },
      },
    });
  }
  async cart(userId: string, couponCode?: string) {
    const cart = await this.cartRecord(userId);
    const subtotal = cart.items.reduce(
      (sum, item) => sum + Number(item.course.salePrice ?? item.course.price),
      0,
    );
    const coupon = couponCode
      ? await this.validCoupon(
          couponCode,
          subtotal,
          cart.items.map((item) => item.courseId),
        )
      : null;
    const discount = coupon
      ? Math.min(
          subtotal,
          coupon.percentOff
            ? (subtotal * coupon.percentOff) / 100
            : Number(coupon.amountOff ?? 0),
        )
      : 0;
    return {
      ...cart,
      summary: {
        subtotal: subtotal.toFixed(2),
        discount: discount.toFixed(2),
        tax: '0.00',
        total: (subtotal - discount).toFixed(2),
        currency: 'MXN',
        coupon: coupon?.code ?? null,
      },
    };
  }
  async add(userId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, status: CourseStatus.PUBLISHED, isListed: true },
    });
    if (!course) throw new NotFoundException('Curso no disponible');
    if (Number(course.salePrice ?? course.price) <= 0)
      throw new BadRequestException(
        'Los cursos gratuitos no requieren carrito',
      );
    const enrolled = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (
      enrolled &&
      (enrolled.status === EnrollmentStatus.ACTIVE ||
        enrolled.status === EnrollmentStatus.COMPLETED)
    )
      throw new ConflictException('Ya tienes acceso a este curso');
    const cart = await this.cartRecord(userId);
    await this.prisma.cartItem.upsert({
      where: { cartId_courseId: { cartId: cart.id, courseId } },
      update: {},
      create: { cartId: cart.id, courseId },
    });
    return this.cart(userId);
  }
  async remove(userId: string, itemId: string) {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cart: { userId } },
    });
    if (!item) throw new NotFoundException('Elemento no encontrado');
    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return this.cart(userId);
  }
  async clear(userId: string) {
    await this.prisma.cartItem.deleteMany({ where: { cart: { userId } } });
    return this.cart(userId);
  }
  private async validCoupon(
    code: string,
    subtotal: number,
    courseIds: string[],
  ) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.trim().toUpperCase() },
      include: { courses: true },
    });
    const now = new Date();
    if (
      !coupon ||
      !coupon.active ||
      (coupon.startsAt && coupon.startsAt > now) ||
      (coupon.expiresAt && coupon.expiresAt < now) ||
      (coupon.maxRedemptions && coupon.redemptionCount >= coupon.maxRedemptions)
    )
      throw new BadRequestException('Cupón no válido o vencido');
    if (coupon.minimumAmount && subtotal < Number(coupon.minimumAmount))
      throw new BadRequestException(
        'El carrito no alcanza el importe mínimo del cupón',
      );
    if (
      coupon.courses.length &&
      !courseIds.some((id) =>
        coupon.courses.some((item) => item.courseId === id),
      )
    )
      throw new BadRequestException('El cupón no aplica a estos cursos');
    return coupon;
  }
  validateCoupon(userId: string, code: string) {
    return this.cart(userId, code);
  }

  async validateCouponForCourses(code: string, courseIds: string[]) {
    const uniqueIds = [...new Set(courseIds)];
    if (!uniqueIds.length)
      throw new BadRequestException('Agrega al menos un curso al carrito');
    const courses = await this.prisma.course.findMany({
      where: { id: { in: uniqueIds }, status: CourseStatus.PUBLISHED },
      select: { id: true, price: true, salePrice: true },
    });
    if (courses.length !== uniqueIds.length)
      throw new BadRequestException('Uno de los cursos ya no está disponible');
    const subtotal = courses.reduce(
      (sum, course) => sum + Number(course.salePrice ?? course.price),
      0,
    );
    const coupon = await this.validCoupon(code, subtotal, uniqueIds);
    const discount = Math.min(
      subtotal,
      coupon.percentOff
        ? (subtotal * coupon.percentOff) / 100
        : Number(coupon.amountOff ?? 0),
    );
    return {
      code: coupon.code,
      subtotal: subtotal.toFixed(2),
      discount: discount.toFixed(2),
      total: (subtotal - discount).toFixed(2),
      currency: 'MXN',
    };
  }

  async checkout(
    userId: string,
    paymentMethod: 'STRIPE' | 'BANK_TRANSFER',
    couponCode?: string,
    program?: 'asistente-ia',
    paymentOption?: 'FULL' | 'INSTALLMENTS',
    analyticsSessionId?: string,
    currencyQuote?: string,
  ) {
    const analyticsSession =
      await this.analytics?.sessionFromHeader(analyticsSessionId);
    if (analyticsSession)
      await this.prisma.analyticsSession.update({
        where: { id: analyticsSession.id },
        data: { userId },
      });
    const paymentSettings = await this.paymentSettingsRecord();
    if (paymentMethod === 'STRIPE' && !paymentSettings.stripeEnabled)
      throw new BadRequestException('Stripe no está disponible');
    if (
      paymentMethod === 'BANK_TRANSFER' &&
      !paymentSettings.bankTransferEnabled
    )
      throw new BadRequestException(
        'La transferencia bancaria no está disponible',
      );
    if (program) {
      if (!paymentOption)
        throw new BadRequestException('Selecciona contado o parcialidades');
      if (couponCode)
        throw new BadRequestException(
          'Esta oferta tiene precios especiales y no admite cupones',
        );
      const order = await this.paidCourse.createInitialOrder(
        userId,
        paymentOption,
        paymentMethod,
      );
      if (analyticsSession && !order.analyticsSessionId) {
        await this.prisma.order.update({
          where: { id: order.id },
          data: { analyticsSessionId: analyticsSession.id },
        });
      }
      if (paymentMethod === 'BANK_TRANSFER') return { order, paymentMethod };
      const resumed = await this.resumePayment(userId, order.id, currencyQuote);
      return { order, paymentMethod, checkoutUrl: resumed.checkoutUrl };
    }
    if (paymentOption)
      throw new BadRequestException('El plan de pago requiere un programa');
    const calculated = await this.cart(userId, couponCode);
    if (!calculated.items.length)
      throw new BadRequestException('El carrito está vacío');
    const duplicate = await this.prisma.enrollment.findFirst({
      where: {
        userId,
        courseId: { in: calculated.items.map((item) => item.courseId) },
        status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] },
      },
    });
    if (duplicate)
      throw new ConflictException('Ya tienes acceso a uno de los cursos');
    const coupon = calculated.summary.coupon
      ? await this.prisma.coupon.findUnique({
          where: { code: calculated.summary.coupon },
        })
      : null;
    const number = `LTA-${new Date().getFullYear()}-${randomBytes(5).toString('hex').toUpperCase()}`;
    const order = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          number,
          userId,
          analyticsSessionId: analyticsSession?.id,
          status:
            paymentMethod === 'BANK_TRANSFER'
              ? OrderStatus.AWAITING_PAYMENT
              : OrderStatus.PENDING,
          subtotal: new Prisma.Decimal(calculated.summary.subtotal),
          discount: new Prisma.Decimal(calculated.summary.discount),
          tax: 0,
          total: new Prisma.Decimal(calculated.summary.total),
          couponId: coupon?.id,
          items: {
            create: calculated.items.map((item) => {
              const price = Number(item.course.salePrice ?? item.course.price);
              return {
                courseId: item.courseId,
                title: item.course.title,
                unitPrice: price,
                total: price,
              };
            }),
          },
          payments: {
            create: {
              provider: paymentMethod,
              status: PaymentStatus.PENDING,
              amount: new Prisma.Decimal(calculated.summary.total),
              currency: 'MXN',
            },
          },
        },
        include: { items: true, payments: true },
      });
      return order;
    });
    await this.sendPurchaseEmails(userId, order, false).catch(() => undefined);
    if (paymentMethod === 'BANK_TRANSFER') {
      return {
        order,
        paymentMethod,
        bankInstructions: {
          bankName: paymentSettings.bankName,
          beneficiary: paymentSettings.bankBeneficiary,
          account: paymentSettings.bankAccount,
          clabe: paymentSettings.bankClabe,
          instructions: paymentSettings.bankInstructions,
          reference: order.number,
          deadlineHours: paymentSettings.paymentDeadlineHours,
        },
      };
    }

    try {
      const checkoutUrl = await this.createStripeCheckoutSession(
        order,
        `/mi-aprendizaje/pedidos?cancelled=1&order=${order.id}`,
        undefined,
        currencyQuote,
      );
      return { order, paymentMethod, checkoutUrl };
    } catch {
      await this.prisma.order.updateMany({
        where: { id: order.id, status: OrderStatus.PENDING },
        data: { status: OrderStatus.FAILED },
      });
      throw new BadRequestException(
        'No fue posible iniciar el pago. Puedes reintentarlo desde tus pedidos.',
      );
    }
  }

  private async completePayment(
    orderId: string,
    paymentId: string,
    provider: 'STRIPE' | 'BANK_TRANSFER',
    externalId: string,
    presentment?: Stripe.Checkout.Session.PresentmentDetails | null,
  ) {
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true, payments: true },
    });
    const confirmed = await this.prisma.$transaction(async (tx) => {
      // Serialize payments of the same plan before reading its remaining balance.
      if (order.paymentPlanId)
        await tx.coursePaymentPlan.update({
          where: { id: order.paymentPlanId },
          data: { updatedAt: new Date() },
        });
      const claimed = await tx.order.updateMany({
        where: {
          id: order.id,
          status: {
            in: [
              OrderStatus.PENDING,
              OrderStatus.AWAITING_PAYMENT,
              OrderStatus.FAILED,
            ],
          },
        },
        data: { status: OrderStatus.PAID, paidAt: new Date() },
      });
      if (!claimed.count) {
        const current = await tx.order.findUniqueOrThrow({
          where: { id: order.id },
        });
        if (current.status === OrderStatus.PAID) return false;
        throw new BadRequestException(
          'Este pedido no admite confirmar el pago',
        );
      }
      const payment = await tx.payment.updateMany({
        where: {
          id: paymentId,
          orderId: order.id,
          provider,
          status: PaymentStatus.PENDING,
        },
        data: {
          status: PaymentStatus.SUCCEEDED,
          processedAt: new Date(),
          externalId,
          ...(presentment
            ? {
                presentmentAmount: presentment.presentment_amount,
                presentmentCurrency:
                  presentment.presentment_currency.toUpperCase(),
              }
            : {}),
        },
      });
      if (!payment.count)
        throw new BadRequestException(
          'El pago pendiente no corresponde al pedido',
        );
      await this.paidCourse.onPaid(tx, order, provider);
      if (!order.paymentPlanId || order.installmentNumber === 1) {
        for (const item of order.items) {
          await tx.enrollment.upsert({
            where: {
              userId_courseId: {
                userId: order.userId,
                courseId: item.courseId,
              },
            },
            update: {
              status: EnrollmentStatus.ACTIVE,
              source: order.paymentPlanId ? 'PAID_COURSE' : 'PURCHASE',
            },
            create: {
              userId: order.userId,
              courseId: item.courseId,
              status: EnrollmentStatus.ACTIVE,
              source: order.paymentPlanId ? 'PAID_COURSE' : 'PURCHASE',
            },
          });
          await this.sendcorex?.enrollment(tx, order.userId, item.courseId);
        }
      }
      if (order.couponId) {
        await tx.coupon.update({
          where: { id: order.couponId },
          data: { redemptionCount: { increment: 1 } },
        });
        await tx.couponRedemption.upsert({
          where: {
            couponId_orderId: { couponId: order.couponId, orderId: order.id },
          },
          update: {},
          create: {
            couponId: order.couponId,
            userId: order.userId,
            orderId: order.id,
          },
        });
      }
      if (!order.paymentPlanId)
        await tx.cartItem.deleteMany({
          where: { cart: { userId: order.userId } },
        });
      await this.analytics?.purchase(tx, order);
      return true;
    });
    const updated = await this.prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { items: true, payments: true },
    });
    if (confirmed && !order.paymentPlanId)
      await this.sendPurchaseEmails(order.userId, updated, true).catch(
        () => undefined,
      );
    return updated;
  }

  async approveBankTransfer(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    if (order.status === OrderStatus.PAID) return order;
    const payment = order.payments.find(
      (item) =>
        item.provider === 'BANK_TRANSFER' &&
        item.status === PaymentStatus.PENDING,
    );
    if (!payment) throw new BadRequestException('El pago no puede confirmarse');
    return this.completePayment(
      order.id,
      payment.id,
      'BANK_TRANSFER',
      'bank-' + order.id,
    );
  }

  async confirmStripeCheckout(
    userId: string,
    orderId: string,
    sessionId: string,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { items: true, payments: true },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    if (order.status === OrderStatus.PAID) return order;
    const payment = order.payments.find((item) => item.provider === 'STRIPE');
    if (!payment || payment.externalId !== sessionId)
      throw new BadRequestException(
        'La sesión de Stripe no corresponde al pedido',
      );

    const { client } = await this.stripeClient();
    const session = await client.checkout.sessions.retrieve(sessionId);
    const stripeOrderId =
      session.metadata?.orderId || session.client_reference_id;
    if (stripeOrderId !== order.id || session.metadata?.userId !== userId)
      throw new BadRequestException(
        'Stripe devolvió una referencia de pedido inválida',
      );
    if (session.payment_status !== 'paid' || session.status !== 'complete')
      throw new BadRequestException(
        'El pago todavía no ha sido completado en Stripe',
      );
    this.assertStripeSession(order, session);

    return this.completePayment(
      order.id,
      payment.id,
      'STRIPE',
      session.id,
      session.presentment_details ?? {
        presentment_amount: session.amount_total!,
        presentment_currency: session.currency!,
      },
    );
  }

  async processStripeWebhook(signature: string | undefined, rawBody: Buffer) {
    if (!signature) throw new BadRequestException('Firma de Stripe ausente');
    const { client, settings } = await this.stripeClient();
    if (!settings.stripeWebhookSecretEncrypted)
      throw new BadRequestException('Webhook de Stripe no configurado');
    let event: Stripe.Event;
    const webhookSecret = this.decryptStripeSecret(
      settings.stripeWebhookSecretEncrypted,
    );
    try {
      event = client.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch {
      throw new BadRequestException('Firma de webhook inválida');
    }
    if (event.livemode !== (settings.stripeMode === 'LIVE'))
      throw new BadRequestException(
        'El modo del webhook de Stripe no coincide',
      );
    const existing = await this.prisma.paymentEvent.findUnique({
      where: { externalEventId: event.id },
    });
    if (existing?.processed) return { received: true, duplicate: true };
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId || session.client_reference_id;
    await this.prisma.paymentEvent.upsert({
      where: { externalEventId: event.id },
      update: {},
      create: {
        provider: 'STRIPE',
        externalEventId: event.id,
        eventType: event.type,
        orderId: orderId || null,
      },
    });
    if (
      [
        'checkout.session.completed',
        'checkout.session.async_payment_succeeded',
      ].includes(event.type) &&
      session.payment_status === 'paid' &&
      orderId
    ) {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: { payments: true },
      });
      if (!order) throw new NotFoundException('Pedido de Stripe no encontrado');
      this.assertStripeSession(order, session);
      const payment = order.payments.find(
        (item) => item.provider === 'STRIPE' && item.externalId === session.id,
      );
      if (!payment)
        throw new BadRequestException(
          'La sesión de Stripe no corresponde al pedido',
        );
      await this.completePayment(
        order.id,
        payment.id,
        'STRIPE',
        session.id,
        session.presentment_details ?? {
          presentment_amount: session.amount_total!,
          presentment_currency: session.currency!,
        },
      );
    }
    await this.prisma.paymentEvent.update({
      where: { externalEventId: event.id },
      data: { processed: true, processedAt: new Date() },
    });
    return { received: true };
  }

  orders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { course: { select: { slug: true } } } },
        payments: true,
        paymentPlan: true,
      },
    });
  }
  async resumePayment(userId: string, orderId: string, currencyQuote?: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { items: true, payments: true },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    if (
      ![OrderStatus.PENDING, OrderStatus.FAILED].includes(
        order.status as 'PENDING' | 'FAILED',
      )
    )
      throw new BadRequestException(
        order.status === OrderStatus.PAID
          ? 'Este pedido ya fue pagado'
          : 'Este pedido no admite reanudar el pago con tarjeta',
      );
    const payment = order.payments.find(
      (item) =>
        item.provider === 'STRIPE' && item.status === PaymentStatus.PENDING,
    );
    if (!payment)
      throw new BadRequestException('El pago pendiente de Stripe no existe');

    const { client } = await this.stripeClient();
    if (order.status === OrderStatus.FAILED)
      await this.prisma.order.updateMany({
        where: { id: order.id, status: OrderStatus.FAILED },
        data: { status: OrderStatus.PENDING },
      });
    if (payment.externalId) {
      let previous: Stripe.Checkout.Session | undefined;
      try {
        previous = await client.checkout.sessions.retrieve(payment.externalId);
      } catch (error) {
        // Only a missing Stripe session permits replacement. Network/auth errors must not create another charge opportunity.
        if (
          !(error instanceof Stripe.errors.StripeInvalidRequestError) ||
          error.code !== 'resource_missing'
        )
          throw error;
      }
      if (
        previous?.status === 'complete' &&
        previous.payment_status === 'paid'
      ) {
        await this.confirmStripeCheckout(userId, order.id, previous.id);
        const front = this.config.get<string>(
          'FRONTEND_URL',
          'http://localhost:3000',
        );
        return {
          orderId: order.id,
          checkoutUrl:
            front +
            '/checkout/exito?order=' +
            encodeURIComponent(order.id) +
            '&session_id=' +
            encodeURIComponent(previous.id),
        };
      }
      if (previous?.status === 'open' && !currencyQuote) {
        this.assertStripeSession(order, previous);
        if (previous.url)
          return { orderId: order.id, checkoutUrl: previous.url };
        if (previous.ui_mode !== 'elements')
          throw new BadRequestException('El pago pendiente no está disponible');
      }
      if (previous?.status === 'complete')
        throw new BadRequestException(
          'Stripe aún está procesando este pago. Espera su confirmación.',
        );
    }
    const checkoutUrl = await this.createStripeCheckoutSession(
      order,
      `/mi-aprendizaje/pedidos?cancelled=1&order=${order.id}`,
      client,
      currencyQuote,
    );
    return { orderId: order.id, checkoutUrl };
  }
  async order(userId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, userId },
      include: {
        items: { include: { course: { select: { slug: true } } } },
        payments: true,
        paymentPlan: true,
      },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    return order;
  }
  coupons() {
    return this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  }
  adminOrders() {
    return this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        items: true,
        payments: true,
        paymentPlan: true,
      },
      take: 200,
    });
  }
  createCoupon(dto: CreateCouponDto) {
    if (!dto.percentOff && !dto.amountOff)
      throw new BadRequestException('Define un descuento');
    return this.prisma.coupon.create({
      data: { ...dto, code: dto.code.trim().toUpperCase() },
    });
  }
}
