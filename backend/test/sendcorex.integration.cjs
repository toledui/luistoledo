require('dotenv/config');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Test } = require('@nestjs/testing');
const { ConfigService } = require('@nestjs/config');
const { JwtService } = require('@nestjs/jwt');
const { SchedulerRegistry } = require('@nestjs/schedule');
const { ValidationPipe } = require('@nestjs/common');
const cookieParser = require('cookie-parser');
const { PrismaService } = require('../dist/src/prisma/prisma.service');
const { AppModule } = require('../dist/src/app.module');
const { SendcorexService } = require('../dist/src/sendcorex/sendcorex.service');
const {
  EnrollmentsService,
} = require('../dist/src/enrollments/enrollments.service');
const {
  MasterclassService,
} = require('../dist/src/masterclass/masterclass.service');
const { EmailService } = require('../dist/src/email/email.service');
const {
  MASTERCLASS,
} = require('../dist/src/masterclass/masterclass.constants');
const config = new ConfigService();
const prisma = new PrismaService(config);
const rollback = new Error('SENDCOREX_TEST_ROLLBACK');
const originalFetch = global.fetch;
let checks = 0;

async function run() {
  try {
    await prisma.$transaction(
      async (tx) => {
        const client = new Proxy(tx, {
          get(target, key) {
            if (key === 'onModuleDestroy') return () => Promise.resolve();
            return key === '$transaction'
              ? (input) =>
                  typeof input === 'function' ? input(tx) : Promise.all(input)
              : target[key];
          },
        });
        const module = await Test.createTestingModule({ imports: [AppModule] })
          .overrideProvider(PrismaService)
          .useValue(client)
          .overrideProvider(EmailService)
          .useValue({
            processItem: async () => {},
            sendRendered: async () => {},
          })
          .setLogger({
            log() {},
            error() {},
            warn() {},
            debug() {},
            verbose() {},
          })
          .compile();
        const app = module.createNestApplication({ logger: false });
        try {
          app.setGlobalPrefix('api/v1');
          app.use(cookieParser());
          app.useGlobalPipes(
            new ValidationPipe({
              transform: true,
              whitelist: true,
              forbidNonWhitelisted: true,
            }),
          );
          await app.init();
          const scheduler = app.get(SchedulerRegistry);
          for (const key of scheduler.getIntervals())
            scheduler.deleteInterval(key);
          for (const key of scheduler.getTimeouts())
            scheduler.deleteTimeout(key);
          for (const key of scheduler.getCronJobs().keys())
            scheduler.deleteCronJob(key);
          await app.listen(0, '127.0.0.1');
          const api = `${await app.getUrl()}/api/v1`;
          const suffix = randomUUID();
          await tx.sendcorexSyncRun.deleteMany();
          await tx.sendcorexImportRun.deleteMany();
          await tx.sendcorexImportedContact.deleteMany();
          await tx.sendcorexDelivery.deleteMany(); // Isolated transaction, always rolled back.
          await tx.contactSetting.upsert({
            where: { id: 1 },
            create: { id: 1, turnstileEnabled: false },
            update: { turnstileEnabled: false },
          });
          await tx.sendcorexSetting.upsert({
            where: { id: 1 },
            create: { id: 1 },
            update: { enabled: false, apiKeyEncrypted: null },
          });
          const role = await tx.role.findUniqueOrThrow({
            where: { name: 'SUPER_ADMIN' },
          });
          const user = await tx.user.create({
            data: {
              firstName: 'Sendcorex',
              lastName: 'Integration',
              email: `sync-${suffix}@example.invalid`,
              passwordHash: 'not-a-login-credential',
              status: 'ACTIVE',
              roles: { create: { roleId: role.id } },
            },
          });
          const session = await tx.authSession.create({
            data: {
              userId: user.id,
              refreshTokenHash: randomUUID(),
              expiresAt: new Date(Date.now() + 3600000),
            },
          });
          const token = app.get(JwtService).sign(
            { sub: user.id, email: user.email, sessionId: session.id },
            {
              secret: config.getOrThrow('JWT_ACCESS_SECRET'),
              expiresIn: '15m',
            },
          );
          const request = async (
            method,
            route,
            body,
            expected = 200,
            auth = true,
          ) => {
            const response = await originalFetch(`${api}${route}`, {
              method,
              headers: {
                ...(body ? { 'Content-Type': 'application/json' } : {}),
                ...(auth
                  ? {
                      Cookie: `${config.get('COOKIE_ACCESS_NAME', 'lt_access')}=${token}`,
                    }
                  : {}),
              },
              ...(body ? { body: JSON.stringify(body) } : {}),
            });
            const value = await response.json();
            assert.equal(
              response.status,
              expected,
              `${route}: ${JSON.stringify(value)}`,
            );
            return value;
          };
          const sync = app.get(SendcorexService);
          await request('GET', '/admin/sendcorex/settings', null, 401, false);
          checks++;
          await request(
            'PATCH',
            '/admin/sendcorex/settings',
            { enabled: true },
            400,
          );
          checks++;
          const saved = await request('PATCH', '/admin/sendcorex/settings', {
            enabled: false,
            apiKey: 'test-only-key',
          });
          assert.deepEqual(saved, { enabled: false, apiKeyConfigured: true });
          const stored = await tx.sendcorexSetting.findUniqueOrThrow({
            where: { id: 1 },
          });
          assert.notEqual(stored.apiKeyEncrypted, 'test-only-key');
          checks++;
          const contact = {
            name: 'Newsletter Tester',
            email: `contact-${suffix}@example.invalid`,
            subject: 'Consulta de prueba',
            message: 'Mensaje privado que no debe salir a Sendcorex.',
          };
          const opted = await request(
            'POST',
            '/contacts',
            { ...contact, newsletterOptIn: true },
            201,
            false,
          );
          const record = await tx.contactRequest.findUniqueOrThrow({
            where: { id: opted.id },
          });
          assert.equal(record.newsletterOptIn, true);
          assert.ok(record.newsletterConsentAt);
          checks++;
          await request(
            'POST',
            '/contacts',
            { ...contact, newsletterOptIn: false },
            201,
            false,
          );
          await request('POST', '/contacts', contact, 201, false);
          assert.equal(await tx.sendcorexDelivery.count(), 1);
          checks++;
          await request(
            'POST',
            '/contacts',
            { ...contact, newsletterOptIn: 'true' },
            400,
            false,
          );
          checks++;
          const enrollments = app.get(EnrollmentsService);
          const course = await tx.course.create({
            data: {
              slug: `sync-${suffix}`,
              title: 'Prueba Sendcorex',
              status: 'PUBLISHED',
              createdById: user.id,
            },
          });
          await enrollments.enrollFree(user.id, course.id);
          await enrollments.adminEnroll(course.id, user.id);
          assert.equal(
            await tx.sendcorexDelivery.count({ where: { source: 'curso' } }),
            1,
          );
          checks++;
          const paid = await tx.course.create({
            data: {
              slug: `paid-sync-${suffix}`,
              title: 'Curso de pago',
              status: 'PUBLISHED',
              price: 100,
              createdById: user.id,
            },
          });
          await assert.rejects(() => enrollments.enrollFree(user.id, paid.id));
          assert.equal(
            await tx.sendcorexDelivery.count({ where: { source: 'curso' } }),
            1,
          );
          checks++;
          // Make the masterclass fixture independent of the date the suite runs.
          const startsAt = MASTERCLASS.startsAt;
          MASTERCLASS.startsAt = new Date(Date.now() + 86400000).toISOString();
          try {
            const registration = {
              name: 'Masterclass Tester',
              email: `master-${suffix}@example.invalid`,
              whatsapp: '+525555555555',
            };
            await app.get(MasterclassService).register(registration);
            await app.get(MasterclassService).register(registration);
            assert.equal(
              await tx.sendcorexDelivery.count({
                where: { source: 'masterclass' },
              }),
              1,
            );
            checks++;
          } finally {
            MASTERCLASS.startsAt = startsAt;
          }
          let sent = [];
          let providerStatus = 200;
          let providerOk = true;
          let rejectedEmail = '';
          global.fetch = async (url, options) => {
            assert.equal(url, 'https://g.sendcorex.com/v1/contacts');
            assert.equal(options.headers.Authorization, 'test-only-key');
            const requestBody = JSON.parse(options.body);
            sent.push(requestBody);
            return new Response(
              JSON.stringify({
                type: 'SUCCESS',
                results: [
                  {
                    type: 'SUCCESS',
                    data: {
                      failed_count: providerOk ? 0 : 1,
                      items: requestBody.commands[0].args.contacts.map(
                        (row) => ({
                          id: row.email,
                          ok: providerOk && row.email !== rejectedEmail,
                        }),
                      ),
                    },
                  },
                ],
              }),
              { status: providerStatus, headers: { 'Retry-After': '120' } },
            );
          };
          await sync.processQueue();
          assert.equal(sent.length, 0);
          checks++;
          await request('PATCH', '/admin/sendcorex/settings', {
            enabled: true,
          });
          providerStatus = 429;
          await sync.processQueue();
          assert.equal(
            await tx.sendcorexDelivery.count({
              where: { status: 'PENDING', lastError: 'HTTP_429' },
            }),
            3,
          );
          assert.ok(
            (await tx.sendcorexDelivery.findFirst()).nextAttemptAt.getTime() >
              Date.now() + 100000,
          );
          checks++;
          providerStatus = 200;
          providerOk = false;
          await tx.sendcorexDelivery.updateMany({
            data: { nextAttemptAt: new Date(0) },
          });
          await sync.processQueue();
          assert.equal(
            await tx.sendcorexDelivery.count({
              where: { lastError: 'PROVIDER_REJECTED', status: 'PENDING' },
            }),
            3,
          );
          checks++;
          providerOk = true;
          sent = [];
          await tx.sendcorexDelivery.updateMany({
            data: { nextAttemptAt: new Date(0) },
          });
          await sync.processQueue();
          assert.equal(
            await tx.sendcorexDelivery.count({
              where: { status: 'DELIVERED' },
            }),
            3,
          );
          for (const body of sent) {
            const row = body.commands[0].args.contacts[0];
            assert.equal(row.status, undefined);
            assert.equal(row.lists, undefined);
            assert.equal(row.message, undefined);
            assert.ok(row.tags.includes('academia'));
          }
          const count = sent.length;
          await sync.processQueue();
          assert.equal(sent.length, count);
          checks++;
          await tx.sendcorexDelivery.updateMany({
            data: {
              status: 'PENDING',
              attempts: 7,
              nextAttemptAt: new Date(0),
            },
          });
          providerStatus = 401;
          await sync.processQueue();
          assert.equal(
            await tx.sendcorexDelivery.count({
              where: { status: 'FAILED', attempts: 8 },
            }),
            3,
          );
          assert.deepEqual(
            await request('POST', '/admin/sendcorex/retry', {}, 201),
            { queued: 3 },
          );
          checks++;
          const audit = await tx.settingAudit.findFirst({
            where: { section: 'sendcorex', actorId: user.id },
          });
          assert.ok(audit);
          assert.equal(JSON.stringify(audit).includes('test-only-key'), false);
          checks++;
          // Historical registrations appear before they have any delivery row.
          await tx.masterclassRegistration.create({
            data: {
              eventKey: 'history',
              name: 'Histórico',
              email: `history-${suffix}@example.invalid`,
              whatsapp: '+525555555555',
            },
          });
          await tx.contactRequest.create({
            data: {
              name: 'Boletín histórico',
              email: `oldnewsletter-${suffix}@example.invalid`,
              subject: 'Historia',
              message: 'No compartir este mensaje',
              newsletterOptIn: true,
              newsletterConsentAt: new Date(),
            },
          });
          await tx.contactRequest.create({
            data: {
              name: 'Sin consentimiento',
              email: `excluded-${suffix}@example.invalid`,
              subject: 'Historia',
              message: 'No suscribir',
            },
          });
          await tx.enrollment.create({
            data: { userId: user.id, courseId: paid.id, status: 'COMPLETED' },
          });
          const directory = await request(
            'GET',
            `/admin/sendcorex/contacts?search=${suffix}`,
          );
          assert.equal(directory.total, 5);
          assert.equal(
            directory.items.find((row) => row.email === user.email).missing,
            1,
          );
          assert.equal(
            directory.items.some((row) => row.email.startsWith('excluded-')),
            false,
          );
          assert.equal(
            (
              await request(
                'GET',
                `/admin/sendcorex/contacts?search=${suffix}&status=NOT_QUEUED`,
              )
            ).total,
            3,
          );
          assert.equal(
            (
              await request(
                'GET',
                `/admin/sendcorex/contacts?search=${suffix}&pageSize=2&page=2`,
              )
            ).items.length,
            2,
          );
          await request(
            'GET',
            '/admin/sendcorex/contacts?pageSize=10000',
            null,
            400,
          );
          await request('GET', '/admin/sendcorex/contacts', null, 401, false);
          checks++;
          // Suppress the immediate kick so the test can inspect durable state first.
          const process = sync.processQueue.bind(sync);
          sync.processQueue = async () => {};
          try {
            assert.deepEqual(
              await request('POST', '/admin/sendcorex/sync-all', {}, 201),
              { started: true },
            );
            await request('POST', '/admin/sendcorex/sync-all', {}, 409);
          } finally {
            sync.processQueue = process;
          }
          providerStatus = 200;
          providerOk = true;
          for (let turn = 0; turn < 200; turn++) {
            await sync.processQueue();
            const run = await tx.sendcorexSyncRun.findUnique({
              where: { id: 1 },
            });
            const remaining = await tx.sendcorexDelivery.count({
              where: { status: { in: ['PENDING', 'PROCESSING'] } },
            });
            if (run.status === 'COMPLETED' && remaining === 0) break;
          }
          const after = await request(
            'GET',
            `/admin/sendcorex/contacts?search=${suffix}`,
          );
          assert.equal(after.run.status, 'COMPLETED');
          assert.equal(after.total, 5);
          assert.equal(after.summary.DELIVERED, 5);
          assert.equal(
            after.items.find((row) => row.email === user.email).registrations,
            2,
          );
          assert.equal(
            await tx.sendcorexDelivery.count({
              where: {
                dedupeKey: { startsWith: 'contact:' },
                payload: { path: '$.email', string_starts_with: 'excluded-' },
              },
            }),
            0,
          );
          assert.ok(
            await tx.settingAudit.findFirst({
              where: { actorId: user.id, action: 'SYNC_ALL' },
            }),
          );
          checks++;
          // Remote deletion cannot be inferred from a local acknowledgement; a
          // second full sync deliberately re-sends previously delivered contacts.
          const beforeResync = sent.length;
          sync.processQueue = async () => {};
          try {
            await request('POST', '/admin/sendcorex/sync-all', {}, 201);
          } finally {
            sync.processQueue = process;
          }
          await sync.processQueue();
          assert.ok(sent.length > beforeResync);
          checks++;
          const upload = async (
            route,
            csv,
            expected = 201,
            authenticated = true,
          ) => {
            const body = new FormData();
            body.append(
              'file',
              new Blob([csv], { type: 'text/csv' }),
              'directory.csv',
            );
            const response = await originalFetch(`${api}${route}`, {
              method: 'POST',
              headers: authenticated
                ? {
                    Cookie: `${config.get('COOKIE_ACCESS_NAME', 'lt_access')}=${token}`,
                  }
                : {},
              body,
            });
            const value = await response.json();
            assert.equal(response.status, expected, JSON.stringify(value));
            return value;
          };
          const csv = `email,nombre,telefono\n"csv-${suffix}@example.invalid","Ana, María",+525555555555\n${user.email},Alumno importado,\nCSV-${suffix}@example.invalid,Ana actualizada,\ninvalid,No importar,\n`;
          const preview = await upload('/admin/sendcorex/imports/preview', csv);
          assert.equal(preview.valid, 2);
          assert.equal(preview.invalid, 1);
          assert.equal(preview.duplicates, 1);
          assert.equal(await tx.sendcorexImportRun.count(), 0);
          await upload('/admin/sendcorex/imports/preview', csv, 401, false);
          await upload('/admin/sendcorex/imports', 'email\ninvalid', 400);
          await upload(
            '/admin/sendcorex/imports/preview',
            'a'.repeat(2 * 1024 * 1024 + 1),
            413,
          );
          checks++;
          // Local imports work while the provider is disabled, and remain queued.
          await request('PATCH', '/admin/sendcorex/settings', {
            enabled: false,
          });
          sync.processQueue = async () => {};
          let imported;
          try {
            imported = await upload('/admin/sendcorex/imports', csv);
          } finally {
            sync.processQueue = process;
          }
          const sentBeforeImport = sent.length;
          await sync.processQueue();
          assert.equal(sent.length, sentBeforeImport);
          assert.equal(await tx.sendcorexImportedContact.count(), 2);
          const importRun = await tx.sendcorexImportRun.findUnique({
            where: { id: imported.id },
          });
          assert.equal(importRun.processed, 2);
          assert.equal(importRun.status, 'COMPLETED');
          assert.deepEqual(importRun.rows, []);
          assert.equal(
            await tx.sendcorexDelivery.count({
              where: { source: 'importado', status: 'PENDING' },
            }),
            2,
          );
          checks++;
          await request('PATCH', '/admin/sendcorex/settings', {
            enabled: true,
          });
          await sync.processQueue();
          const withCsv = await request(
            'GET',
            `/admin/sendcorex/contacts?search=${suffix}`,
          );
          assert.equal(withCsv.total, 6);
          assert.ok(
            withCsv.items
              .find((row) => row.email === user.email)
              .sources.includes('importado'),
          );
          assert.equal(
            await tx.sendcorexDelivery.count({
              where: { source: 'importado', status: 'DELIVERED' },
            }),
            2,
          );
          checks++;
          sync.processQueue = async () => {};
          try {
            await upload('/admin/sendcorex/imports', csv);
          } finally {
            sync.processQueue = process;
          }
          await sync.processQueue();
          assert.equal(await tx.sendcorexImportedContact.count(), 2);
          assert.equal(
            await tx.sendcorexDelivery.count({
              where: { source: 'importado' },
            }),
            2,
          );
          checks++;
          // Exercise several durable CSV pages and a partial provider failure.
          await request('PATCH', '/admin/sendcorex/settings', {
            enabled: false,
          });
          const largeCsv =
            'email,nombre\n' +
            Array.from(
              { length: 205 },
              (_, index) =>
                `bulk-${index}-${suffix}@example.invalid,Contacto ${index}`,
            ).join('\n');
          sync.processQueue = async () => {};
          let largeRun;
          try {
            largeRun = await upload('/admin/sendcorex/imports', largeCsv);
          } finally {
            sync.processQueue = process;
          }
          await sync.processQueue();
          assert.equal(
            (
              await tx.sendcorexImportRun.findUnique({
                where: { id: largeRun.id },
              })
            ).processed,
            100,
          );
          // A fresh worker object resumes from the cursor, simulating restart.
          const {
            EncryptionService,
          } = require('../dist/src/crypto/encryption.service');
          const resumed = new SendcorexService(
            client,
            app.get(EncryptionService),
          );
          await resumed.processQueue();
          await resumed.processQueue();
          assert.equal(
            (
              await tx.sendcorexImportRun.findUnique({
                where: { id: largeRun.id },
              })
            ).processed,
            205,
          );
          assert.equal(await tx.sendcorexImportedContact.count(), 207);
          checks++;
          await request('PATCH', '/admin/sendcorex/settings', {
            enabled: true,
          });
          rejectedEmail = `bulk-0-${suffix}@example.invalid`;
          await sync.processQueue();
          const firstLargeBatch = sent.at(-1).commands[0].args.contacts;
          assert.equal(firstLargeBatch.length, 100);
          const rejected = await tx.sendcorexDelivery.findFirst({
            where: { payload: { path: '$.email', equals: rejectedEmail } },
          });
          assert.equal(rejected.status, 'PENDING');
          assert.equal(rejected.lastError, 'PROVIDER_REJECTED');
          assert.equal(
            await tx.sendcorexDelivery.count({
              where: {
                source: 'importado',
                status: 'DELIVERED',
                payload: { path: '$.email', string_starts_with: 'bulk-' },
              },
            }),
            99,
          );
          checks++;
          rejectedEmail = '';
          await tx.sendcorexDelivery.updateMany({
            where: { status: 'PENDING' },
            data: { nextAttemptAt: new Date(0) },
          });
          await sync.processQueue();
          await sync.processQueue();
          assert.equal(
            await tx.sendcorexDelivery.count({
              where: {
                source: 'importado',
                status: 'DELIVERED',
                payload: { path: '$.email', string_starts_with: 'bulk-' },
              },
            }),
            205,
          );
          checks++;
          await request('PATCH', '/admin/sendcorex/settings', {
            enabled: false,
            clearApiKey: true,
          });
          assert.deepEqual(await request('GET', '/admin/sendcorex/settings'), {
            enabled: false,
            apiKeyConfigured: false,
          });
          checks++;
        } finally {
          global.fetch = originalFetch;
          await app.close();
        }
        throw rollback;
      },
      { timeout: 60000 },
    );
  } catch (error) {
    if (error !== rollback) throw error;
  }
  console.log(
    `${checks} Sendcorex integration checks passed; all fixtures rolled back, provider mocked, no real contacts or emails sent.`,
  );
}
run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
