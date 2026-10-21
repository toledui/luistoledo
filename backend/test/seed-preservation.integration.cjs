require('dotenv/config');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { ConfigService } = require('@nestjs/config');
const { PrismaService } = require('../dist/src/prisma/prisma.service');
const { seedMissingData } = require('../dist/prisma/safe-seed');
const {
  DEFAULT_EMAIL_TEMPLATES,
} = require('../dist/src/email-templates/default-email-templates');
const prisma = new PrismaService(new ConfigService());
const rollback = new Error('SEED_PRESERVATION_ROLLBACK');
let checks = 0;
async function run() {
  // A blank installation must never receive a default public password.
  await assert.rejects(
    () => seedMissingData({ user: { count: async () => 0 } }, {}),
    /SEED_ADMIN_EMAIL/,
  );
  checks++;
  try {
    await prisma.$transaction(
      async (tx) => {
        const suffix = randomUUID();
        const student = await tx.user.create({
          data: {
            email: `seed-preserve-${suffix}@example.invalid`,
            firstName: 'Nombre personalizado',
            lastName: 'Conservar',
            passwordHash: 'ORIGINAL_PASSWORD_HASH',
            status: 'ACTIVE',
          },
        });
        await tx.user.upsert({
          where: { email: 'admin@luistoledo.local' },
          create: {
            email: 'admin@luistoledo.local',
            firstName: 'Administrador',
            lastName: 'Conservar',
            passwordHash: 'LOCAL_ADMIN_HASH',
            status: 'ACTIVE',
          },
          update: {},
        });
        const template = DEFAULT_EMAIL_TEMPLATES[0];
        const custom = await tx.emailTemplate.upsert({
          where: { event_locale: { event: template.event, locale: 'es-MX' } },
          create: {
            ...template,
            locale: 'es-MX',
            subject: `Asunto personalizado ${suffix}`,
          },
          update: { subject: `Asunto personalizado ${suffix}` },
        });
        const category = await tx.category.upsert({
          where: { slug: 'seo' },
          create: { slug: 'seo', name: 'Mi categoría personalizada' },
          update: { name: 'Mi categoría personalizada' },
        });
        const general = await tx.generalSetting.upsert({
          where: { id: 1 },
          create: { id: 1, academyName: 'Academia personalizada' },
          update: { academyName: 'Academia personalizada' },
        });
        const missingTemplate = DEFAULT_EMAIL_TEMPLATES[1];
        await tx.emailTemplate.deleteMany({
          where: { event: missingTemplate.event, locale: 'es-MX' },
        });
        const before = {
          users: await tx.user.findMany({ orderBy: { id: 'asc' } }),
          roles: await tx.userRole.findMany({
            orderBy: [{ userId: 'asc' }, { roleId: 'asc' }],
          }),
          templates: await tx.emailTemplate.findMany(),
          courses: await tx.course.findMany({ orderBy: { id: 'asc' } }),
          orders: await tx.order.findMany({ orderBy: { id: 'asc' } }),
          enrollments: await tx.enrollment.findMany({ orderBy: { id: 'asc' } }),
          email: await tx.emailProviderSetting.findUnique({ where: { id: 1 } }),
          payment: await tx.paymentProviderSetting.findUnique({
            where: { id: 1 },
          }),
        };
        const env = {
          SEED_ADMIN_EMAIL: student.email,
          SEED_ADMIN_PASSWORD: 'NewPasswordMustNeverReplaceOriginal123!',
        };
        await seedMissingData(tx, env);
        assert.ok(
          await tx.emailTemplate.findUnique({
            where: {
              event_locale: { event: missingTemplate.event, locale: 'es-MX' },
            },
          }),
        );
        checks++;
        await seedMissingData(tx, {
          ...env,
          SEED_ADMIN_EMAIL: `must-not-create-${suffix}@example.invalid`,
        });
        assert.deepEqual(
          await tx.user.findMany({ orderBy: { id: 'asc' } }),
          before.users,
        );
        checks++;
        assert.deepEqual(
          await tx.userRole.findMany({
            orderBy: [{ userId: 'asc' }, { roleId: 'asc' }],
          }),
          before.roles,
        );
        checks++;
        for (const existing of before.templates)
          assert.deepEqual(
            await tx.emailTemplate.findUnique({ where: { id: existing.id } }),
            existing,
          );
        assert.deepEqual(
          await tx.emailTemplate.findUnique({ where: { id: custom.id } }),
          custom,
        );
        checks++;
        assert.deepEqual(
          await tx.category.findUnique({ where: { id: category.id } }),
          category,
        );
        assert.deepEqual(
          await tx.generalSetting.findUnique({ where: { id: 1 } }),
          general,
        );
        checks++;
        if (before.email)
          assert.deepEqual(
            await tx.emailProviderSetting.findUnique({ where: { id: 1 } }),
            before.email,
          );
        if (before.payment)
          assert.deepEqual(
            await tx.paymentProviderSetting.findUnique({ where: { id: 1 } }),
            before.payment,
          );
        checks++;
        assert.deepEqual(
          await tx.course.findMany({ orderBy: { id: 'asc' } }),
          before.courses,
        );
        assert.deepEqual(
          await tx.order.findMany({ orderBy: { id: 'asc' } }),
          before.orders,
        );
        assert.deepEqual(
          await tx.enrollment.findMany({ orderBy: { id: 'asc' } }),
          before.enrollments,
        );
        checks++;
        assert.ok(
          await tx.permission.findUnique({ where: { code: 'blog.manage' } }),
        );
        const counts = {
          permissions: await tx.permission.count(),
          templates: await tx.emailTemplate.count(),
          categories: await tx.category.count(),
          grants: await tx.rolePermission.count(),
        };
        await seedMissingData(tx, {});
        assert.deepEqual(
          {
            permissions: await tx.permission.count(),
            templates: await tx.emailTemplate.count(),
            categories: await tx.category.count(),
            grants: await tx.rolePermission.count(),
          },
          counts,
        );
        checks++;
        throw rollback;
      },
      { timeout: 60000 },
    );
  } catch (error) {
    if (error !== rollback) throw error;
  }
  console.log(
    `${checks} seed preservation checks passed; no passwords, users, templates, settings or business records overwritten. All fixtures rolled back.`,
  );
}
run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
