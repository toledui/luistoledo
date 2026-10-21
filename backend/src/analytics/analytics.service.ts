import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, Interval } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { createHash, createSign } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../crypto/encryption.service';
import {
  AnalyticsEventDto,
  AnalyticsSessionDto,
  AnalyticsSettingsDto,
} from './analytics.dto';
import { attribution, cleanPath, metaEvents } from './analytics.helpers';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private running = false;
  private reportCache = new Map<string, { expires: number; value: unknown }>();
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly config: ConfigService,
  ) {}
  settings() {
    return this.prisma.analyticsSetting.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    });
  }
  async publicSettings() {
    const s = await this.settings();
    return {
      enabled: s.enabled,
      gtmId: s.gtmId,
      gaMeasurementId: s.gaMeasurementId,
      metaPixelId: s.metaPixelId,
      consentVersion: '2026-10-21',
    };
  }
  async adminSettings() {
    const {
      gaSecretEncrypted,
      metaTokenEncrypted,
      googleCredentialsEncrypted,
      ...s
    } = await this.settings();
    return {
      ...s,
      gaSecretConfigured: !!gaSecretEncrypted,
      metaTokenConfigured: !!metaTokenEncrypted,
      googleCredentialsConfigured: !!googleCredentialsEncrypted,
    };
  }
  async saveSettings(
    dto: AnalyticsSettingsDto,
    actorId: string,
    ipAddress: string,
  ) {
    const { gaSecret, metaToken, googleCredentials, ...data } = dto;
    if (googleCredentials) {
      try {
        const value = JSON.parse(googleCredentials) as {
          client_email?: string;
          private_key?: string;
          type?: string;
        };
        if (
          value.type !== 'service_account' ||
          !value.client_email?.endsWith('.gserviceaccount.com') ||
          !value.private_key?.includes('PRIVATE KEY')
        )
          throw new Error();
        createSign('RSA-SHA256').update('validate').sign(value.private_key);
      } catch {
        throw new BadRequestException(
          'JSON de cuenta de servicio de Google inválido',
        );
      }
    }
    if (
      data.searchConsoleSite &&
      !/^(sc-domain:[a-zA-Z0-9.-]+|https:\/\/[^\s?#]+)$/.test(
        data.searchConsoleSite,
      )
    )
      throw new BadRequestException('Propiedad de Search Console inválida');
    await this.prisma.$transaction(async (tx) => {
      await tx.analyticsSetting.upsert({
        where: { id: 1 },
        create: { id: 1 },
        update: {},
      });
      await tx.analyticsSetting.update({
        where: { id: 1 },
        data: {
          ...data,
          ...(gaSecret !== undefined
            ? {
                gaSecretEncrypted: gaSecret
                  ? this.encryption.encrypt(gaSecret)
                  : null,
              }
            : {}),
          ...(metaToken !== undefined
            ? {
                metaTokenEncrypted: metaToken
                  ? this.encryption.encrypt(metaToken)
                  : null,
              }
            : {}),
          ...(googleCredentials !== undefined
            ? {
                googleCredentialsEncrypted: googleCredentials
                  ? this.encryption.encrypt(googleCredentials)
                  : null,
              }
            : {}),
        },
      });
      await tx.settingAudit.create({
        data: {
          section: 'analytics',
          action: 'UPDATE',
          actorId,
          ipAddress,
          changes: { fields: Object.keys(dto) },
        },
      });
    });
    this.reportCache.clear();
    return this.adminSettings();
  }
  async session(dto: AnalyticsSessionDto, ip: string, userAgent?: string) {
    const s = await this.settings();
    if (!s.enabled) return { accepted: false };
    const existing = await this.prisma.analyticsSession.findUnique({
      where: { id: dto.sessionId },
    });
    if (existing && existing.visitorId !== dto.visitorId)
      throw new BadRequestException('Sesión inválida');
    const ref = (() => {
      try {
        const u = new URL(dto.referrer || '');
        return /^https?:$/.test(u.protocol) ? u.hostname : null;
      } catch {
        return null;
      }
    })();
    const source = attribution(dto);
    const prior = !existing
      ? await this.prisma.analyticsSession.findFirst({
          where: { visitorId: dto.visitorId },
          orderBy: { createdAt: 'asc' },
        })
      : null;
    const latest = !existing
      ? await this.prisma.analyticsSession.findFirst({
          where: { visitorId: dto.visitorId, source: { not: 'direct' } },
          orderBy: { createdAt: 'desc' },
        })
      : null;
    const canRegrant =
      existing?.analyticsConsent !== false || dto.analyticsConsent === false;
    // Revocation applies immediately. A later grant uses a fresh random session ID.
    const analyticsConsent = dto.analyticsConsent && canRegrant;
    const advertisingConsent =
      dto.advertisingConsent &&
      (existing?.advertisingConsent !== false || !existing);
    await this.prisma.analyticsSession.upsert({
      where: { id: dto.sessionId },
      create: {
        id: dto.sessionId,
        visitorId: dto.visitorId,
        analyticsConsent,
        advertisingConsent,
        entryPath: cleanPath(dto.path),
        referrer: ref,
        ...source,
        campaign: dto.campaign,
        term: dto.term,
        firstSource: prior?.firstSource || source.source,
        lastNonDirectSource:
          source.source !== 'direct'
            ? source.source
            : latest?.source || 'direct',
        ipEncrypted:
          s.retainIpDays && analyticsConsent
            ? this.encryption.encrypt(ip)
            : null,
        userAgent: userAgent?.slice(0, 500),
        gaClientId: dto.gaClientId,
        gaSessionId: dto.gaSessionId,
        fbp: advertisingConsent ? dto.fbp : null,
        fbc: advertisingConsent ? dto.fbc : null,
        ...(!analyticsConsent && !advertisingConsent
          ? {
              entryPath: '/',
              referrer: null,
              campaign: null,
              term: null,
              source: 'direct',
              medium: 'none',
              firstSource: 'direct',
              lastNonDirectSource: 'direct',
              userAgent: null,
              gaClientId: null,
              gaSessionId: null,
            }
          : {}),
      },
      update: {
        analyticsConsent: dto.analyticsConsent ? undefined : false,
        advertisingConsent: dto.advertisingConsent ? undefined : false,
        consentAt: new Date(),
        lastSeenAt: new Date(),
        gaClientId: analyticsConsent ? dto.gaClientId : null,
        gaSessionId: analyticsConsent ? dto.gaSessionId : null,
        fbp: advertisingConsent ? dto.fbp : null,
        fbc: advertisingConsent ? dto.fbc : null,
        ...(!analyticsConsent ? { ipEncrypted: null } : {}),
      },
    });
    if (!dto.analyticsConsent && !dto.advertisingConsent) {
      await this.prisma.analyticsSession.updateMany({
        where: { visitorId: dto.visitorId },
        data: {
          analyticsConsent: false,
          advertisingConsent: false,
          ipEncrypted: null,
          fbp: null,
          fbc: null,
          gaClientId: null,
          gaSessionId: null,
        },
      });
    }
    return { accepted: analyticsConsent || advertisingConsent };
  }
  async collect(dto: AnalyticsEventDto) {
    const s = await this.settings();
    if (!s.enabled || cleanPath(dto.path).startsWith('/admin'))
      return { accepted: false };
    const session = await this.prisma.analyticsSession.findUnique({
      where: { id: dto.sessionId },
    });
    if (
      !session?.analyticsConsent ||
      Date.now() - session.lastSeenAt.getTime() > 35 * 60000
    )
      return { accepted: false };
    await this.prisma.$transaction(async (tx) => {
      await tx.analyticsEvent.upsert({
        where: { id: dto.eventId },
        update: {},
        create: {
          id: dto.eventId,
          sessionId: session.id,
          name: dto.name,
          path: cleanPath(dto.path),
          source: session.source,
          origin: 'browser',
          value: dto.value,
          currency: dto.currency,
          data: {
            item_id: dto.itemId,
            item_name: dto.itemName,
            items: dto.items?.map((item) => ({
              item_id: item.item_id,
              item_name: item.item_name,
              price: item.price,
              quantity: item.quantity,
            })),
          },
        },
      });
      await tx.analyticsSession.update({
        where: { id: session.id },
        data: { lastSeenAt: new Date() },
      });
    });
    return { accepted: true };
  }
  async sessionFromHeader(header?: string) {
    if (!header || !/^[a-zA-Z0-9.-]{16,64}$/.test(header)) return null;
    const session = await this.prisma.analyticsSession.findUnique({
      where: { id: header },
    });
    return session && Date.now() - session.lastSeenAt.getTime() < 35 * 60000
      ? session
      : null;
  }
  async confirmed(
    name: string,
    id: string,
    sessionId: string,
    path: string,
    userId?: string,
  ) {
    const s = await this.settings();
    const session = await this.sessionFromHeader(sessionId);
    if (
      !s.enabled ||
      !session ||
      (!session.analyticsConsent && !session.advertisingConsent)
    )
      return null;
    const eventId = `${name}.${createHash('sha256').update(id).digest('hex')}`;
    const existing = await this.prisma.analyticsEvent.findUnique({
      where: { id: eventId },
    });
    if (existing) return null;
    await this.prisma.$transaction(async (tx) => {
      await tx.analyticsEvent.upsert({
        where: { id: eventId },
        update: {},
        create: {
          id: eventId,
          sessionId,
          name,
          path: cleanPath(path),
          source: session.lastNonDirectSource,
          origin: 'server',
        },
      });
      if (userId)
        await tx.analyticsSession.update({
          where: { id: sessionId },
          data: { userId },
        });
      await this.enqueue(
        tx,
        eventId,
        session.analyticsConsent,
        session.advertisingConsent,
      );
    });
    return { eventId, name, server: true };
  }
  private async enqueue(
    tx: Prisma.TransactionClient,
    eventId: string,
    analytics: boolean,
    advertising: boolean,
  ) {
    const event = await tx.analyticsEvent.findUniqueOrThrow({
      where: { id: eventId },
    });
    for (const provider of [
      ...(analytics ? ['GA4'] : []),
      ...(advertising && metaEvents[event.name] ? ['META'] : []),
    ]) {
      await tx.analyticsDelivery.upsert({
        where: { eventId_provider: { eventId, provider } },
        update: {},
        create: { eventId, provider },
      });
    }
  }
  async purchase(
    tx: Prisma.TransactionClient,
    order: {
      id: string;
      analyticsSessionId?: string | null;
      paymentPlanId?: string | null;
      total: Prisma.Decimal;
      currency?: string;
      installmentNumber?: number | null;
      items: { courseId: string; title: string; unitPrice?: Prisma.Decimal }[];
    },
  ) {
    // Called inside the payment transaction: payment and durable event commit together.
    let sessionId = order.analyticsSessionId;
    if (!sessionId && order.paymentPlanId) {
      const initial = await tx.order.findFirst({
        where: {
          paymentPlanId: order.paymentPlanId,
          analyticsSessionId: { not: null },
        },
        orderBy: { installmentNumber: 'asc' },
      });
      sessionId = initial?.analyticsSessionId;
    }
    if (!sessionId) return;
    const s = await tx.analyticsSetting.findUnique({ where: { id: 1 } });
    const session = await tx.analyticsSession.findUnique({
      where: { id: sessionId },
    });
    if (
      !s?.enabled ||
      !session ||
      (!session.analyticsConsent && !session.advertisingConsent)
    )
      return;
    const id = `purchase.${order.id}`;
    await tx.analyticsEvent.upsert({
      where: { id },
      update: {},
      create: {
        id,
        sessionId: session.id,
        name: 'purchase',
        path: '/checkout/exito',
        source: session.lastNonDirectSource,
        origin: 'server',
        value: order.total,
        currency: order.currency || 'MXN',
        data: {
          transaction_id: order.id,
          installment_number: order.installmentNumber,
          items: order.items.map((item) => ({
            item_id: item.courseId,
            item_name: item.title,
            quantity: 1,
            price: Number(item.unitPrice || order.total),
          })),
        },
      },
    });
    await this.enqueue(
      tx,
      id,
      session.analyticsConsent,
      session.advertisingConsent,
    );
  }
  @Interval(30000)
  async deliver() {
    if (this.running) return;
    this.running = true;
    try {
      const s = await this.settings();
      if (!s.enabled) return;
      // Recover leases after a worker restart. Conditional claiming also works across processes.
      await this.prisma.analyticsDelivery.updateMany({
        where: { status: 'PROCESSING', nextAttemptAt: { lt: new Date() } },
        data: { status: 'PENDING' },
      });
      const jobs = await this.prisma.analyticsDelivery.findMany({
        where: { status: 'PENDING', nextAttemptAt: { lte: new Date() } },
        take: 25,
        orderBy: { nextAttemptAt: 'asc' },
        include: { event: { include: { session: true } } },
      });
      for (const job of jobs) {
        const claimed = await this.prisma.analyticsDelivery.updateMany({
          where: { id: job.id, status: 'PENDING' },
          data: {
            status: 'PROCESSING',
            nextAttemptAt: new Date(Date.now() + 120000),
          },
        });
        if (!claimed.count) continue;
        try {
          const { event } = job;
          const session = event.session;
          if (
            !session ||
            !(job.provider === 'GA4'
              ? session.analyticsConsent
              : session.advertisingConsent)
          ) {
            await this.prisma.analyticsDelivery.update({
              where: { id: job.id },
              data: {
                status: 'SKIPPED',
                lastError: 'Consentimiento revocado o sesión eliminada',
              },
            });
            continue;
          }
          if (Date.now() - event.createdAt.getTime() > 70 * 3600000)
            throw new Error('EXPIRED');
          let url: string;
          let payload: unknown;
          const details = (event.data || {}) as Record<
            string,
            Prisma.JsonValue
          >;
          if (job.provider === 'GA4') {
            if (
              !s.gaMeasurementId ||
              !s.gaSecretEncrypted ||
              !session.gaClientId ||
              !session.gaSessionId
            )
              throw new Error('NOT_CONFIGURED');
            url = `https://www.google-analytics.com/mp/collect?measurement_id=${s.gaMeasurementId}&api_secret=${encodeURIComponent(this.encryption.decrypt(s.gaSecretEncrypted))}`;
            payload = {
              client_id: session.gaClientId,
              timestamp_micros: event.createdAt.getTime() * 1000,
              consent: {
                ad_user_data: session.advertisingConsent ? 'GRANTED' : 'DENIED',
                ad_personalization: session.advertisingConsent
                  ? 'GRANTED'
                  : 'DENIED',
              },
              events: [
                {
                  name: event.name,
                  params: {
                    ...details,
                    event_id: event.id,
                    session_id: Number(session.gaSessionId),
                    engagement_time_msec: 1,
                    page_location: `${this.config.get<string>('FRONTEND_URL', 'http://localhost:3000')}${event.path}`,
                    ...(event.value !== null
                      ? { value: Number(event.value), currency: event.currency }
                      : {}),
                  },
                },
              ],
            };
          } else {
            if (
              !s.metaPixelId ||
              !s.metaTokenEncrypted ||
              !metaEvents[event.name]
            )
              throw new Error('NOT_CONFIGURED');
            url = `https://graph.facebook.com/${s.metaApiVersion}/${s.metaPixelId}/events`;
            payload = {
              access_token: this.encryption.decrypt(s.metaTokenEncrypted),
              data: [
                {
                  event_name: metaEvents[event.name],
                  event_id: event.id,
                  event_time: Math.floor(event.createdAt.getTime() / 1000),
                  action_source: 'website',
                  event_source_url: `${this.config.get<string>('FRONTEND_URL', 'http://localhost:3000')}${event.path}`,
                  user_data: {
                    external_id: [
                      createHash('sha256')
                        .update(session.visitorId)
                        .digest('hex'),
                    ],
                    client_user_agent: session.userAgent,
                    fbp: session.fbp || undefined,
                    fbc: session.fbc || undefined,
                  },
                  custom_data:
                    event.value !== null
                      ? {
                          value: Number(event.value),
                          currency: event.currency,
                          order_id: details.transaction_id,
                          content_type: 'product',
                          content_ids: Array.isArray(details.items)
                            ? details.items.map(
                                (item) =>
                                  (item as Record<string, Prisma.JsonValue>)
                                    .item_id,
                              )
                            : undefined,
                        }
                      : undefined,
                },
              ],
            };
          }
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(10000),
          });
          if (!response.ok) throw new Error(`HTTP_${response.status}`);
          if (job.provider === 'META') {
            const result = (await response.json()) as {
              events_received?: number;
              error?: unknown;
            };
            if (result.error || result.events_received !== 1)
              throw new Error('META_REJECTED');
          }
          await this.prisma.analyticsDelivery.update({
            where: { id: job.id },
            data: {
              status: 'SENT',
              sentAt: new Date(),
              attempts: { increment: 1 },
              lastError: null,
            },
          });
        } catch (error) {
          // Never persist provider response bodies, request URLs or secrets.
          const code =
            error instanceof Error &&
            /^(HTTP_\d+|EXPIRED|NOT_CONFIGURED|META_REJECTED)$/.test(
              error.message,
            )
              ? error.message
              : 'NETWORK_OR_CONFIGURATION_ERROR';
          const terminal =
            code === 'EXPIRED' ||
            (code.startsWith('HTTP_4') && code !== 'HTTP_429') ||
            job.attempts >= 9;
          await this.prisma.analyticsDelivery.update({
            where: { id: job.id },
            data: {
              status: terminal ? 'FAILED' : 'PENDING',
              attempts: { increment: 1 },
              lastError: code,
              nextAttemptAt: new Date(
                Date.now() + Math.min(3600000, 30000 * 2 ** job.attempts),
              ),
            },
          });
        }
      }
    } catch {
      this.logger.warn(
        'No se pudo procesar la cola de analítica; revisa migraciones y conexión de base de datos.',
      );
    } finally {
      this.running = false;
    }
  }
  @Cron('0 3 * * *', { timeZone: 'America/Mexico_City' })
  async cleanup() {
    const s = await this.settings();
    await this.prisma.analyticsSession.updateMany({
      where: {
        createdAt: { lt: new Date(Date.now() - s.retainIpDays * 86400000) },
        ipEncrypted: { not: null },
      },
      data: { ipEncrypted: null },
    });
    const before = new Date(Date.now() - s.retainEventsDays * 86400000);
    await this.prisma.analyticsEvent.deleteMany({
      where: { createdAt: { lt: before } },
    });
    await this.prisma.analyticsSession.deleteMany({
      where: { lastSeenAt: { lt: before } },
    });
  }
  days(raw?: string) {
    const days = Number(raw || 30);
    if (!Number.isInteger(days) || days < 1 || days > 365)
      throw new BadRequestException('Rango de 1 a 365 días');
    return days;
  }
  async summary(raw?: string) {
    const days = this.days(raw);
    const since = new Date(Date.now() - days * 86400000);
    const where = {
      createdAt: { gte: since },
      session: { analyticsConsent: true },
    };
    const [
      visitors,
      sessions,
      active,
      events,
      sources,
      pages,
      revenue,
      deliveries,
      daily,
      conversions,
    ] = await Promise.all([
      this.prisma.analyticsSession.groupBy({
        by: ['visitorId'],
        where: { createdAt: { gte: since }, analyticsConsent: true },
      }),
      this.prisma.analyticsSession.count({
        where: { createdAt: { gte: since }, analyticsConsent: true },
      }),
      this.prisma.analyticsSession.count({
        where: {
          lastSeenAt: { gte: new Date(Date.now() - 5 * 60000) },
          analyticsConsent: true,
        },
      }),
      this.prisma.analyticsEvent.groupBy({ by: ['name'], where, _count: true }),
      this.prisma.analyticsSession.groupBy({
        by: ['source', 'medium'],
        where: { createdAt: { gte: since }, analyticsConsent: true },
        _count: true,
        orderBy: { _count: { source: 'desc' } },
        take: 30,
      }),
      this.prisma.analyticsEvent.groupBy({
        by: ['path'],
        where: { ...where, name: 'page_view' },
        _count: true,
        orderBy: { _count: { path: 'desc' } },
        take: 20,
      }),
      this.prisma.analyticsEvent.aggregate({
        where: { ...where, name: 'purchase' },
        _sum: { value: true },
        _count: true,
      }),
      this.prisma.analyticsDelivery.groupBy({
        by: ['provider', 'status', 'lastError'],
        _count: true,
      }),
      this.prisma.$queryRaw<{ day: string; views: bigint }[]>(
        Prisma.sql`SELECT DATE_FORMAT(e.createdAt, '%Y-%m-%d') AS day, COUNT(*) AS views FROM AnalyticsEvent e INNER JOIN AnalyticsSession s ON e.sessionId = s.id WHERE e.createdAt >= ${since} AND e.name = 'page_view' AND s.analyticsConsent = true GROUP BY day ORDER BY day`,
      ),
      this.prisma.analyticsEvent.groupBy({
        by: ['source', 'name'],
        where: {
          ...where,
          name: { in: ['generate_lead', 'sign_up', 'purchase'] },
        },
        _count: true,
        _sum: { value: true },
        orderBy: { _count: { source: 'desc' } },
        take: 100,
      }),
    ]);
    return {
      days,
      updatedAt: new Date(),
      visitors: visitors.length,
      sessions,
      active,
      events,
      sources,
      pages,
      revenue: Number(revenue._sum.value || 0),
      purchases: revenue._count,
      conversions: conversions.map((row) => ({
        source: row.source,
        name: row.name,
        count: row._count,
        value: Number(row._sum.value || 0),
      })),
      deliveries,
      daily: daily.map((row) => ({ day: row.day, views: Number(row.views) })),
    };
  }
  async visits(raw?: string, pageRaw?: string) {
    const days = this.days(raw);
    const page = Number(pageRaw || 1);
    if (!Number.isInteger(page) || page < 1 || page > 10000)
      throw new BadRequestException('Página inválida');
    const where = {
      createdAt: { gte: new Date(Date.now() - days * 86400000) },
      analyticsConsent: true,
    };
    const [items, total] = await Promise.all([
      this.prisma.analyticsSession.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: (page - 1) * 50,
        select: {
          id: true,
          visitorId: true,
          userId: true,
          createdAt: true,
          entryPath: true,
          source: true,
          medium: true,
          campaign: true,
          term: true,
          referrer: true,
          firstSource: true,
          lastNonDirectSource: true,
          ipEncrypted: true,
        },
      }),
      this.prisma.analyticsSession.count({ where }),
    ]);
    return {
      page,
      total,
      items: items.map(({ ipEncrypted, ...item }) => ({
        ...item,
        ip: ipEncrypted ? this.encryption.decrypt(ipEncrypted) : null,
      })),
    };
  }
  private async googleToken(credentials: string) {
    const c = JSON.parse(this.encryption.decrypt(credentials)) as {
      client_email: string;
      private_key: string;
    };
    const now = Math.floor(Date.now() / 1000);
    const encode = (v: unknown) =>
      Buffer.from(JSON.stringify(v)).toString('base64url');
    const base = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ iss: c.client_email, scope: 'https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/webmasters.readonly', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })}`;
    const signature = createSign('RSA-SHA256')
      .update(base)
      .sign(c.private_key, 'base64url');
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: `${base}.${signature}`,
      }),
      signal: AbortSignal.timeout(10000),
    });
    const value = (await response.json()) as { access_token?: string };
    if (!response.ok || !value.access_token)
      throw new Error('GOOGLE_AUTH_ERROR');
    return value.access_token;
  }
  async reports(raw?: string) {
    const days = this.days(raw);
    const s = await this.settings();
    const key = `${days}.${s.updatedAt.getTime()}`;
    const cached = this.reportCache.get(key);
    if (cached && cached.expires > Date.now()) return cached.value;
    if (!s.googleCredentialsEncrypted)
      return {
        configured: false,
        message:
          'Configura la cuenta de servicio de Google para consultar GA4 y Search Console.',
      };
    try {
      const token = await this.googleToken(s.googleCredentialsEncrypted);
      const request = async (url: string, body: unknown) => {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(15000),
        });
        if (!response.ok)
          return {
            error: `HTTP_${response.status}: revisa permisos y propiedad`,
          };
        return response.json() as Promise<unknown>;
      };
      const end = new Date().toISOString().slice(0, 10);
      const start = new Date(Date.now() - days * 86400000)
        .toISOString()
        .slice(0, 10);
      const [ga4, searchConsole] = await Promise.all([
        s.gaPropertyId
          ? request(
              `https://analyticsdata.googleapis.com/v1beta/properties/${s.gaPropertyId}:runReport`,
              {
                dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
                dimensions: [
                  { name: 'sessionSourceMedium' },
                  { name: 'country' },
                  { name: 'city' },
                ],
                metrics: [
                  { name: 'totalUsers' },
                  { name: 'sessions' },
                  { name: 'screenPageViews' },
                  { name: 'purchaseRevenue' },
                ],
                limit: 100,
                orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
              },
            )
          : null,
        s.searchConsoleSite
          ? request(
              `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(s.searchConsoleSite)}/searchAnalytics/query`,
              {
                startDate: start,
                endDate: end,
                dimensions: ['query', 'page'],
                rowLimit: 100,
              },
            )
          : null,
      ]);
      const value = {
        configured: true,
        updatedAt: new Date().toISOString(),
        ga4,
        searchConsole,
      };
      this.reportCache.set(key, { expires: Date.now() + 15 * 60000, value });
      return value;
    } catch {
      return {
        configured: true,
        error:
          'No fue posible consultar Google. Revisa credenciales, APIs habilitadas y permisos de las propiedades.',
      };
    }
  }
}
