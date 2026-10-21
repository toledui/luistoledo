import { Prisma, UserStatus } from '@prisma/client';
import { hash } from 'argon2';
import { DEFAULT_EMAIL_TEMPLATES } from '../src/email-templates/default-email-templates';

export async function seedMissingData(
  prisma: Prisma.TransactionClient,
  env: NodeJS.ProcessEnv = process.env,
) {
  const bootstrap = (await prisma.user.count()) === 0;
  const email = env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = env.SEED_ADMIN_PASSWORD;
  if (
    bootstrap &&
    (!email ||
      !password ||
      password.length < 12 ||
      password === 'replace-with-a-strong-initial-password')
  ) {
    throw new Error(
      'Base sin usuarios: configura SEED_ADMIN_EMAIL y una SEED_ADMIN_PASSWORD propia de al menos 12 caracteres para crear el primer administrador.',
    );
  }
  const codes = [
    'settings.manage',
    'analytics.read',
    'analytics.ip.read',
    'users.manage',
    'courses.manage',
    'blog.manage',
    'orders.manage',
    'media.manage',
  ];
  for (const code of codes) {
    await prisma.permission.upsert({
      where: { code },
      update: {},
      create: { code },
    });
  }
  const role = await prisma.role.upsert({
    where: { name: 'SUPER_ADMIN' },
    update: {},
    create: {
      name: 'SUPER_ADMIN',
      description: 'Acceso total a la plataforma',
    },
  });
  for (const name of ['ADMIN', 'STUDENT']) {
    await prisma.role.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const code of codes) {
    const permission = await prisma.permission.findUniqueOrThrow({
      where: { code },
    });
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: role.id, permissionId: permission.id },
      },
      update: {},
      create: { roleId: role.id, permissionId: permission.id },
    });
  }
  if (bootstrap) {
    const user = await prisma.user.upsert({
      where: { email: email! },
      update: {},
      create: {
        email: email!,
        passwordHash: await hash(password!, { type: 2 }),
        firstName: env.SEED_ADMIN_NAME ?? 'Luis',
        lastName: env.SEED_ADMIN_LAST_NAME ?? 'Toledo',
        status: UserStatus.ACTIVE,
      },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    });
  }
  await prisma.generalSetting.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  await prisma.brandingSetting.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  await prisma.securitySetting.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  await prisma.emailProviderSetting.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  await prisma.paymentProviderSetting.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  for (const template of DEFAULT_EMAIL_TEMPLATES)
    await prisma.emailTemplate.upsert({
      where: { event_locale: { event: template.event, locale: 'es-MX' } },
      update: {},
      create: { ...template, locale: 'es-MX' },
    });
  for (const name of [
    'Desarrollo Web',
    'Marketing Digital',
    'Ventas B2B',
    'Automatización',
    'Inteligencia Artificial',
    'SEO',
  ]) {
    const slug = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, '-');
    await prisma.category.upsert({
      where: { slug },
      update: {},
      create: { name, slug },
    });
  }
}
