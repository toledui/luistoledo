require('dotenv/config');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { ConfigService } = require('@nestjs/config');
const { NestFactory } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
const cookieParser = require('cookie-parser');
const { PrismaService } = require('../dist/src/prisma/prisma.service');
const { EncryptionService } = require('../dist/src/crypto/encryption.service');
const { AnalyticsService } = require('../dist/src/analytics/analytics.service');
const {
  PaidCourseService,
} = require('../dist/src/paid-course/paid-course.service');
const { SalesService } = require('../dist/src/sales/sales.service');
const { AppModule } = require('../dist/src/app.module');
const config = new ConfigService();
const prisma = new PrismaService(config);
const rollback = new Error('ANALYTICS_TEST_ROLLBACK');
let checks = 0;
async function databaseChecks() {
  try {
    await prisma.$transaction(
      async (tx) => {
        const client = new Proxy(tx, {
          get(target, key) {
            return key === '$transaction'
              ? (callback) => callback(tx)
              : target[key];
          },
        });
        const analytics = new AnalyticsService(
          client,
          new EncryptionService(config),
          config,
        );
        const suffix = randomUUID();
        const sessionId = randomUUID();
        const visitorId = randomUUID();
        const dto = {
          sessionId,
          visitorId,
          analyticsConsent: true,
          advertisingConsent: true,
          path: '/checkout?token=secret',
          source: `integration-${suffix}`,
          medium: 'test',
          gaClientId: '123.456',
          gaSessionId: '123456',
        };
        await tx.analyticsSetting.upsert({
          where: { id: 1 },
          create: { id: 1 },
          update: { enabled: true },
        });
        await analytics.session(dto, '192.0.2.123', 'integration-browser');
        const saved = await tx.analyticsSession.findUniqueOrThrow({
          where: { id: sessionId },
        });
        assert.equal(saved.entryPath, '/checkout');
        if (saved.ipEncrypted)
          assert.equal(
            new EncryptionService(config).decrypt(saved.ipEncrypted),
            '192.0.2.123',
          );
        assert.notEqual(saved.ipEncrypted, '192.0.2.123');
        checks++;
        const eventId = randomUUID();
        await analytics.collect({
          sessionId,
          eventId,
          name: 'page_view',
          path: '/checkout?session_id=secret',
        });
        await analytics.collect({
          sessionId,
          eventId,
          name: 'page_view',
          path: '/checkout',
        });
        assert.equal(
          await tx.analyticsEvent.count({ where: { id: eventId } }),
          1,
        );
        checks++;
        const course = new PaidCourseService(client, config);
        const offer = course.publicOffer();
        course.publicOffer = () => ({ ...offer, registrationOpen: true });
        const sales = new SalesService(
          client,
          new EncryptionService(config),
          config,
          { sendEvent: () => Promise.resolve() },
          course,
          analytics,
        );
        await tx.paymentProviderSetting.upsert({
          where: { id: 1 },
          create: { id: 1, bankTransferEnabled: true },
          update: { bankTransferEnabled: true },
        });
        const user = await tx.user.create({
          data: {
            email: `analytics-${suffix}@example.invalid`,
            firstName: 'Analytics',
            lastName: 'Integration',
            status: 'ACTIVE',
            passwordHash: 'not-a-login-credential',
          },
        });
        const checkout = await sales.checkout(
          user.id,
          'BANK_TRANSFER',
          undefined,
          'asistente-ia',
          'INSTALLMENTS',
          sessionId,
        );
        await sales.approveBankTransfer(checkout.order.id);
        await sales.approveBankTransfer(checkout.order.id);
        assert.equal(
          await tx.analyticsEvent.count({
            where: { id: `purchase.${checkout.order.id}` },
          }),
          1,
        );
        assert.equal(
          await tx.analyticsDelivery.count({
            where: { eventId: `purchase.${checkout.order.id}` },
          }),
          2,
        );
        checks++;
        const installments = await tx.order.findMany({
          where: {
            paymentPlanId: checkout.order.paymentPlanId,
            installmentNumber: { gt: 1 },
          },
        });
        for (const installment of installments)
          await sales.approveBankTransfer(installment.id);
        const payments = await tx.analyticsEvent.aggregate({
          where: { sessionId, name: 'purchase' },
          _count: true,
          _sum: { value: true },
        });
        assert.equal(payments._count, 3);
        assert.equal(Number(payments._sum.value), 2480);
        checks++;
        const summary = await analytics.summary('1');
        assert.ok(summary.sources.some((s) => s.source === dto.source));
        assert.ok(summary.daily.some((d) => typeof d.views === 'number'));
        checks++;
        const visits = await analytics.visits('1', '1');
        const visit = visits.items.find((v) => v.id === sessionId);
        assert.ok(visit);
        assert.equal('ipEncrypted' in visit, false);
        assert.equal('gaClientId' in visit, false);
        checks++;
        await analytics.session(
          { ...dto, analyticsConsent: false, advertisingConsent: false },
          '192.0.2.123',
        );
        assert.equal(
          (
            await analytics.collect({
              sessionId,
              eventId: randomUUID(),
              name: 'page_view',
              path: '/',
            })
          ).accepted,
          false,
        );
        const revoked = await tx.analyticsSession.findUniqueOrThrow({
          where: { id: sessionId },
        });
        assert.equal(revoked.ipEncrypted, null);
        assert.equal(revoked.advertisingConsent, false);
        checks++;
        throw rollback;
      },
      { timeout: 30000 },
    );
  } catch (error) {
    if (error !== rollback) throw error;
  }
}
async function httpChecks() {
  const app = await NestFactory.create(AppModule, { logger: false });
  try {
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    const publicConfig = await fetch(`${base}/api/v1/analytics/config`);
    assert.equal(publicConfig.status, 200);
    const body = await publicConfig.json();
    assert.equal('gaSecretEncrypted' in body, false);
    assert.equal('metaTokenEncrypted' in body, false);
    checks++;
    assert.equal(
      (await fetch(`${base}/api/v1/admin/analytics/summary`)).status,
      401,
    );
    assert.equal(
      (await fetch(`${base}/api/v1/admin/analytics/visits`)).status,
      401,
    );
    checks++;
    const forged = await fetch(`${base}/api/v1/analytics/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: randomUUID(),
        eventId: randomUUID(),
        name: 'purchase',
        path: '/checkout',
        value: 999,
      }),
    });
    assert.equal(forged.status, 400);
    checks++;
  } finally {
    await app.close();
  }
}
(async () => {
  await databaseChecks();
  await httpChecks();
  console.log(
    `${checks} analytics integration checks passed; payment/session fixtures rolled back, no events sent to external providers.`,
  );
})()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
