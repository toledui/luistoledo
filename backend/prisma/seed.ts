import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient, UserStatus } from '@prisma/client';
import { hash } from 'argon2';
import { DEFAULT_EMAIL_TEMPLATES } from '../src/email-templates/default-email-templates';

const databaseUrl = new URL(
  process.env.DATABASE_URL ?? 'mysql://root:@localhost:3306/luistoledo',
);
const adapter = new PrismaMariaDb({
  host: databaseUrl.hostname,
  port: Number(databaseUrl.port || 3306),
  user: decodeURIComponent(databaseUrl.username),
  password: decodeURIComponent(databaseUrl.password),
  database: databaseUrl.pathname.slice(1),
  connectionLimit: 5,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const codes = [
    'settings.manage',
    'users.manage',
    'courses.manage',
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
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@luistoledo.local';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';
  const passwordHash = await hash(password, { type: 2 });
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: {
      email,
      passwordHash,
      firstName: process.env.SEED_ADMIN_NAME ?? 'Luis',
      lastName: process.env.SEED_ADMIN_LAST_NAME ?? 'Toledo',
      status: UserStatus.ACTIVE,
    },
  });
  if (email !== 'admin@luistoledo.local') {
    await prisma.user.deleteMany({
      where: { email: 'admin@luistoledo.local' },
    });
  }
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    update: {},
    create: { userId: user.id, roleId: role.id },
  });
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
  for (const template of DEFAULT_EMAIL_TEMPLATES)
    await prisma.emailTemplate.upsert({
      where: { event_locale: { event: template.event, locale: 'es-MX' } },
      update: template,
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

void main().finally(() => prisma.$disconnect());
