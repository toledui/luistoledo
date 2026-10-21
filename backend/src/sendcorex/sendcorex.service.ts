import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../crypto/encryption.service';
import { SendcorexSettingsDto, SendcorexContactsDto } from './sendcorex.dto';
import { contactDirectory } from './sendcorex-contacts.sql';
import { parseContactCsv, type ImportedContact } from './contact-csv';

type Contact = {
  email: string;
  name: string;
  lastName?: string;
  phone?: string | null;
  tags: string[];
};
type ProviderResponse = {
  type?: string;
  results?: {
    type?: string;
    data?: { items?: { id?: string; ok?: boolean }[]; failed_count?: number };
  }[];
};

@Injectable()
export class SendcorexService {
  private readonly logger = new Logger(SendcorexService.name);
  private running = false;
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async settings() {
    const row = await this.prisma.sendcorexSetting.findUnique({
      where: { id: 1 },
    });
    return {
      enabled: row?.enabled ?? false,
      apiKeyConfigured: Boolean(row?.apiKeyEncrypted),
    };
  }

  async save(dto: SendcorexSettingsDto, actorId: string) {
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.sendcorexSetting.findUnique({
        where: { id: 1 },
      });
      const apiKeyEncrypted = dto.clearApiKey
        ? null
        : dto.apiKey?.trim()
          ? this.encryption.encrypt(dto.apiKey.trim())
          : current?.apiKeyEncrypted;
      if (dto.enabled && !apiKeyEncrypted)
        throw new BadRequestException(
          'Agrega la clave API antes de activar Sendcorex',
        );
      await tx.sendcorexSetting.upsert({
        where: { id: 1 },
        create: { id: 1, enabled: dto.enabled, apiKeyEncrypted },
        update: { enabled: dto.enabled, apiKeyEncrypted },
      });
      await tx.settingAudit.create({
        data: {
          section: 'sendcorex',
          action: 'UPDATE',
          actorId,
          changes: {
            enabled: dto.enabled,
            keyChanged: Boolean(dto.apiKey?.trim() || dto.clearApiKey),
          },
        },
      });
    });
    return this.settings();
  }

  async enqueue(
    tx: Prisma.TransactionClient,
    dedupeKey: string,
    source: string,
    contact: Contact,
    refresh = false,
  ) {
    const parts = contact.name.trim().split(/\s+/);
    const firstName =
      contact.lastName !== undefined
        ? contact.name.trim()
        : parts.shift() || '';
    const lastName =
      contact.lastName !== undefined ? contact.lastName : parts.join(' ');
    const payload = {
      email: contact.email.trim().toLowerCase(),
      ...(contact.name.trim() &&
      contact.name.trim().toLowerCase() !== contact.email.trim().toLowerCase()
        ? { first_name: firstName.slice(0, 256) }
        : {}),
      ...(lastName ? { last_name: lastName.slice(0, 256) } : {}),
      ...(contact.phone ? { phone: contact.phone.slice(0, 256) } : {}),
      source: 'luistoledo.com.mx',
      tags: ['academia', source, ...contact.tags],
    };
    // Keep prior unsubscribe/suppression status and list preferences untouched.
    await tx.sendcorexDelivery.upsert({
      where: { dedupeKey },
      update: {},
      create: { dedupeKey, source, payload },
    });
    if (refresh) {
      const updated = await tx.sendcorexDelivery.updateMany({
        where: { dedupeKey, status: { not: 'PROCESSING' } },
        data: {
          payload,
          status: 'PENDING',
          attempts: 0,
          nextAttemptAt: new Date(),
          lastError: null,
        },
      });
      if (!updated.count) throw new Error('CONTACT_DELIVERY_BUSY');
    }
  }

  async enrollment(
    tx: Prisma.TransactionClient,
    userId: string,
    courseId: string,
    refresh = false,
  ) {
    const enrollment = await tx.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      include: { user: { include: { profile: true } } },
    });
    if (!enrollment) return;
    await this.enqueue(
      tx,
      `course:${enrollment.id}`,
      'curso',
      {
        email: enrollment.user.email,
        name: enrollment.user.firstName,
        lastName: enrollment.user.lastName,
        phone: enrollment.user.profile?.phone,
        tags: [`curso:${courseId}`],
      },
      refresh,
    );
  }

  async status() {
    const [counts, recent] = await Promise.all([
      this.prisma.sendcorexDelivery.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.sendcorexDelivery.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 20,
        select: {
          id: true,
          source: true,
          status: true,
          attempts: true,
          lastError: true,
          createdAt: true,
          deliveredAt: true,
        },
      }),
    ]);
    return {
      counts: Object.fromEntries(
        counts.map((row) => [row.status, row._count._all]),
      ),
      recent,
    };
  }

  async contacts(query: SendcorexContactsDto) {
    type Row = {
      email: string;
      name: string;
      phone: string | null;
      sources: string;
      registrations: bigint;
      missing: bigint;
      delivered: bigint;
      failed: bigint;
      pending: bigint;
      lastDeliveredAt: Date | null;
      lastError: string | null;
      status: string;
    };
    const search = query.search?.trim();
    const match = search
      ? Prisma.sql`(email LIKE ${`%${search}%`} OR name LIKE ${`%${search}%`})`
      : Prisma.sql`1=1`;
    const filter = query.status
      ? Prisma.sql`${match} AND status = ${query.status}`
      : match;
    const [rows, total, summary, run, imports] = await Promise.all([
      this.prisma.$queryRaw<Row[]>(
        Prisma.sql`${contactDirectory} SELECT * FROM directory WHERE ${filter} ORDER BY email LIMIT ${query.pageSize} OFFSET ${(query.page - 1) * query.pageSize}`,
      ),
      this.prisma.$queryRaw<{ total: bigint }[]>(
        Prisma.sql`${contactDirectory} SELECT COUNT(*) AS total FROM directory WHERE ${filter}`,
      ),
      this.prisma.$queryRaw<{ status: string; total: bigint }[]>(
        Prisma.sql`${contactDirectory} SELECT status, COUNT(*) AS total FROM directory WHERE ${match} GROUP BY status`,
      ),
      this.prisma.sendcorexSyncRun.findUnique({
        where: { id: 1 },
        select: {
          status: true,
          stage: true,
          scanned: true,
          startedAt: true,
          completedAt: true,
        },
      }),
      this.prisma.sendcorexImportRun.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          filename: true,
          status: true,
          total: true,
          processed: true,
          invalid: true,
          duplicates: true,
          lastError: true,
          createdAt: true,
          completedAt: true,
        },
      }),
    ]);
    return {
      items: rows.map((row) => ({
        ...row,
        name: row.name || row.email,
        sources: row.sources.split(','),
        registrations: Number(row.registrations),
        missing: Number(row.missing),
        delivered: Number(row.delivered),
        failed: Number(row.failed),
        pending: Number(row.pending),
      })),
      total: Number(total[0].total),
      page: query.page,
      pageSize: query.pageSize,
      summary: Object.fromEntries(
        summary.map((row) => [row.status, Number(row.total)]),
      ),
      run,
      imports,
    };
  }

  async startSync(actorId: string) {
    const settings = await this.settings();
    if (!settings.enabled || !settings.apiKeyConfigured)
      throw new BadRequestException(
        'Configura y activa Sendcorex antes de sincronizar',
      );
    await this.prisma.sendcorexSyncRun.upsert({
      where: { id: 1 },
      create: { id: 1 },
      update: {},
    });
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.sendcorexSyncRun.updateMany({
        where: { id: 1, status: { not: 'RUNNING' } },
        data: {
          status: 'RUNNING',
          stage: 0,
          cursor: null,
          scanned: 0,
          startedAt: new Date(),
          completedAt: null,
          leaseToken: null,
          leaseUntil: null,
          actorId,
        },
      });
      if (!claimed.count)
        throw new ConflictException('Ya hay una sincronización en curso');
      await tx.sendcorexDelivery.updateMany({
        where: { status: { not: 'PROCESSING' } },
        data: {
          status: 'PENDING',
          attempts: 0,
          nextAttemptAt: new Date(),
          lastError: null,
          leaseToken: null,
        },
      });
      await tx.settingAudit.create({
        data: { section: 'sendcorex', action: 'SYNC_ALL', actorId },
      });
    });
    // Start now; durable cursors and the scheduler continue after a restart.
    void this.processQueue();
    return { started: true };
  }

  private async importPage() {
    const leaseToken = randomUUID();
    const claimed = await this.prisma.sendcorexSyncRun.updateMany({
      where: {
        id: 1,
        status: 'RUNNING',
        OR: [{ leaseUntil: null }, { leaseUntil: { lte: new Date() } }],
      },
      data: { leaseToken, leaseUntil: new Date(Date.now() + 120000) },
    });
    if (!claimed.count) return;
    try {
      await this.prisma.$transaction(
        async (tx) => {
          const run = await tx.sendcorexSyncRun.findFirst({
            where: { id: 1, leaseToken },
          });
          if (!run || !run.startedAt) return;
          const where = {
            ...(run.cursor ? { id: { gt: run.cursor } } : {}),
            createdAt: { lte: run.startedAt },
          };
          let ids: string[] = [];
          if (run.stage === 0) {
            const rows = await tx.masterclassRegistration.findMany({
              where,
              orderBy: { id: 'asc' },
              take: 100,
            });
            ids = rows.map((row) => row.id);
            for (const row of rows)
              await this.enqueue(
                tx,
                `masterclass:${row.id}`,
                'masterclass',
                {
                  email: row.email,
                  name: row.name,
                  phone: row.whatsapp,
                  tags: [`masterclass:${row.eventKey}`],
                },
                true,
              );
          } else if (run.stage === 1) {
            const rows = await tx.enrollment.findMany({
              where: { ...where, status: { in: ['ACTIVE', 'COMPLETED'] } },
              orderBy: { id: 'asc' },
              take: 100,
            });
            ids = rows.map((row) => row.id);
            for (const row of rows)
              await this.enrollment(tx, row.userId, row.courseId, true);
          } else if (run.stage === 2) {
            const rows = await tx.contactRequest.findMany({
              where: { ...where, newsletterOptIn: true },
              orderBy: { id: 'asc' },
              take: 100,
            });
            ids = rows.map((row) => row.id);
            for (const row of rows)
              await this.enqueue(
                tx,
                `contact:${row.id}`,
                'newsletter',
                {
                  email: row.email,
                  name: row.name,
                  phone: row.phone,
                  tags: ['contacto'],
                },
                true,
              );
          } else {
            const rows = await tx.sendcorexImportedContact.findMany({
              where,
              orderBy: { id: 'asc' },
              take: 100,
            });
            ids = rows.map((row) => row.id);
            for (const row of rows)
              await this.enqueue(
                tx,
                `imported:${row.id}`,
                'importado',
                {
                  email: row.email,
                  name: row.name,
                  phone: row.phone,
                  tags: ['directorio'],
                },
                true,
              );
          }
          const finishedStage = ids.length < 100;
          const completed = finishedStage && run.stage === 3;
          const updated = await tx.sendcorexSyncRun.updateMany({
            where: { id: 1, leaseToken },
            data: {
              stage: finishedStage ? run.stage + 1 : run.stage,
              cursor: finishedStage ? null : ids.at(-1),
              scanned: { increment: ids.length },
              status: completed ? 'COMPLETED' : 'RUNNING',
              completedAt: completed ? new Date() : null,
              leaseToken: null,
              leaseUntil: null,
            },
          });
          if (!updated.count) throw new Error('SYNC_LEASE_LOST');
        },
        { timeout: 30000 },
      );
    } catch {
      await this.prisma.sendcorexSyncRun.updateMany({
        where: { id: 1, leaseToken },
        data: { leaseToken: null, leaseUntil: null },
      });
      this.logger.error(
        'La importación de contactos se reintentará desde el último avance guardado.',
      );
    }
  }

  async retry() {
    const result = await this.prisma.sendcorexDelivery.updateMany({
      where: { status: 'FAILED' },
      data: {
        status: 'PENDING',
        attempts: 0,
        nextAttemptAt: new Date(),
        lastError: null,
        leaseToken: null,
      },
    });
    return { queued: result.count };
  }

  @Interval(15000)
  async processQueue() {
    if (this.running) return;
    this.running = true;
    try {
      await this.importCsvPage();
      const settings = await this.prisma.sendcorexSetting.findUnique({
        where: { id: 1 },
      });
      if (!settings?.enabled || !settings.apiKeyEncrypted) return;
      const apiKey = this.encryption.decrypt(settings.apiKeyEncrypted);
      await this.importPage();
      await this.deliverBatch(apiKey);
    } catch {
      this.logger.error(
        'No se pudo procesar la cola de Sendcorex; los registros permanecen guardados.',
      );
    } finally {
      this.running = false;
    }
  }

  async startImport(buffer: Buffer, filename: string, actorId: string) {
    const parsed = parseContactCsv(buffer);
    if (!parsed.valid)
      throw new BadRequestException(
        'El CSV no contiene contactos válidos para importar',
      );
    const run = await this.prisma.$transaction(async (tx) => {
      const run = await tx.sendcorexImportRun.create({
        data: {
          filename: filename.slice(0, 191),
          rows: parsed.rows,
          total: parsed.valid,
          invalid: parsed.invalid,
          duplicates: parsed.duplicates,
          actorId,
        },
      });
      await tx.settingAudit.create({
        data: {
          section: 'sendcorex',
          action: 'IMPORT_CSV',
          actorId,
          changes: {
            importId: run.id,
            total: run.total,
            invalid: run.invalid,
            duplicates: run.duplicates,
          },
        },
      });
      return run;
    });
    void this.processQueue();
    return {
      id: run.id,
      total: run.total,
      invalid: run.invalid,
      duplicates: run.duplicates,
      status: run.status,
    };
  }

  private async importCsvPage() {
    const run = await this.prisma.sendcorexImportRun.findFirst({
      where: {
        status: { in: ['PENDING', 'RUNNING'] },
        OR: [{ leaseUntil: null }, { leaseUntil: { lte: new Date() } }],
      },
      orderBy: { createdAt: 'asc' },
    });
    if (!run) return;
    const leaseToken = randomUUID();
    const claimed = await this.prisma.sendcorexImportRun.updateMany({
      where: {
        id: run.id,
        processed: run.processed,
        status: { in: ['PENDING', 'RUNNING'] },
        OR: [{ leaseUntil: null }, { leaseUntil: { lte: new Date() } }],
      },
      data: {
        status: 'RUNNING',
        leaseToken,
        leaseUntil: new Date(Date.now() + 120000),
      },
    });
    if (!claimed.count) return;
    try {
      await this.prisma.$transaction(
        async (tx) => {
          const rows = (run.rows as ImportedContact[]).slice(
            run.processed,
            run.processed + 100,
          );
          for (const row of rows) {
            const contact = await tx.sendcorexImportedContact.upsert({
              where: { email: row.email },
              create: row,
              update: {
                ...(row.name !== row.email ? { name: row.name } : {}),
                ...(row.phone ? { phone: row.phone } : {}),
              },
            });
            await this.enqueue(
              tx,
              `imported:${contact.id}`,
              'importado',
              {
                email: contact.email,
                name: contact.name,
                phone: contact.phone,
                tags: ['directorio'],
              },
              true,
            );
          }
          const processed = run.processed + rows.length;
          const complete = processed >= run.total;
          const updated = await tx.sendcorexImportRun.updateMany({
            where: { id: run.id, leaseToken },
            data: {
              processed,
              status: complete ? 'COMPLETED' : 'RUNNING',
              completedAt: complete ? new Date() : null,
              leaseToken: null,
              leaseUntil: null,
              lastError: null,
              ...(complete ? { rows: [] } : {}),
            },
          });
          if (!updated.count) throw new Error('IMPORT_LEASE_LOST');
        },
        { timeout: 30000 },
      );
    } catch {
      await this.prisma.sendcorexImportRun.updateMany({
        where: { id: run.id, leaseToken },
        data: {
          leaseToken: null,
          leaseUntil: null,
          lastError: 'IMPORT_RETRY_PENDING',
        },
      });
      this.logger.error(
        'La importación CSV se reintentará desde el último lote guardado.',
      );
    }
  }

  private async deliverBatch(apiKey: string) {
    const due = {
      status: { in: ['PENDING', 'PROCESSING'] },
      nextAttemptAt: { lte: new Date() },
    };
    const jobs = await this.prisma.sendcorexDelivery.findMany({
      where: due,
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    const leaseToken = randomUUID();
    const claimed: typeof jobs = [];
    for (const job of jobs) {
      const result = await this.prisma.sendcorexDelivery.updateMany({
        where: { id: job.id, ...due },
        data: {
          status: 'PROCESSING',
          leaseToken,
          nextAttemptAt: new Date(Date.now() + 120000),
          attempts: { increment: 1 },
        },
      });
      if (result.count) claimed.push(job);
    }
    if (!claimed.length) return;
    // One provider contact per email in a batch; preserve tags from every origin.
    const contacts = new Map<string, Prisma.JsonObject>();
    for (const job of claimed) {
      const payload = job.payload as Prisma.JsonObject;
      const email =
        typeof payload.email === 'string' ? payload.email.toLowerCase() : '';
      const previous = contacts.get(email);
      contacts.set(email, {
        ...previous,
        ...payload,
        email,
        tags: [
          ...new Set([
            ...(Array.isArray(previous?.tags) ? previous.tags : []),
            ...(Array.isArray(payload.tags) ? payload.tags : []),
          ]),
        ],
      });
    }
    let error: string | null = null;
    let retryAfter = 0;
    let items: { id?: string; ok?: boolean }[] = [];
    try {
      const response = await fetch('https://g.sendcorex.com/v1/contacts', {
        method: 'POST',
        headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({
          commands: [
            {
              command: 'upsert_contacts',
              args: { contacts: [...contacts.values()] },
            },
          ],
        }),
      });
      if (!response.ok) {
        error = `HTTP_${response.status}`;
        const seconds = Number(response.headers.get('retry-after'));
        if (Number.isFinite(seconds))
          retryAfter = Math.min(Math.max(seconds, 0), 86400) * 1000;
      } else {
        const body = (await response.json()) as ProviderResponse;
        const result = body.results?.[0];
        if (
          body.type !== 'SUCCESS' ||
          result?.type !== 'SUCCESS' ||
          !Array.isArray(result.data?.items)
        )
          error = 'PROVIDER_REJECTED';
        else items = result.data.items;
      }
    } catch {
      error = 'NETWORK_OR_RESPONSE_ERROR';
    }
    for (const job of claimed) {
      const payload = job.payload as Prisma.JsonObject;
      const email =
        typeof payload.email === 'string' ? payload.email.toLowerCase() : '';
      const item = items.find((item) => item.id?.toLowerCase() === email);
      const failure = error || (item?.ok === true ? null : 'PROVIDER_REJECTED');
      await this.prisma.sendcorexDelivery.updateMany({
        where: { id: job.id, leaseToken, status: 'PROCESSING' },
        data: {
          leaseToken: null,
          status: failure
            ? job.attempts + 1 >= 8
              ? 'FAILED'
              : 'PENDING'
            : 'DELIVERED',
          lastError: failure,
          deliveredAt: failure ? job.deliveredAt : new Date(),
          nextAttemptAt: new Date(
            Date.now() +
              Math.max(
                retryAfter,
                Math.min(3600000, 15000 * 2 ** Math.min(job.attempts, 8)),
              ),
          ),
        },
      });
    }
  }
}
