import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import type { Server } from 'node:http';
import { AuthModule } from './auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { UsersModule } from '../users/users.module';
import { UsersService } from '../users/users.service';
import { PaidCourseModule } from '../paid-course/paid-course.module';
import { PaidCourseService } from '../paid-course/paid-course.service';

describe('API keys HTTP authentication', () => {
  let app: INestApplication<Server>;
  const bearer = `Bearer lta_${'a'.repeat(64)}`;
  const prisma = {
    apiKey: { findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn() },
    user: { findUnique: jest.fn(), findUniqueOrThrow: jest.fn() },
    authSession: { findFirst: jest.fn() },
    settingAudit: { create: jest.fn() },
  };
  const users = { list: jest.fn(), create: jest.fn(), updateRoles: jest.fn() };
  const paidCourse = { summary: jest.fn(), setReminders: jest.fn() };
  const owner = {
    id: 'owner',
    email: 'owner@example.com',
    status: 'ACTIVE',
    roles: [
      {
        role: {
          permissions: [
            { permission: { code: 'users.manage' } },
            { permission: { code: 'settings.manage' } },
            { permission: { code: 'orders.manage' } },
          ],
        },
      },
    ],
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        AuthModule,
        UsersModule,
        PaidCourseModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(UsersService)
      .useValue(users)
      .overrideProvider(PaidCourseService)
      .useValue(paidCourse)
      .overrideProvider(JwtService)
      .useValue({
        verifyAsync: jest.fn().mockResolvedValue({
          sub: 'owner',
          email: owner.email,
          sessionId: 'session',
        }),
      })
      .compile();
    app = module.createNestApplication<INestApplication<Server>>();
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.apiKey.findUnique.mockResolvedValue({
      id: 'key',
      userId: 'owner',
      scopes: ['users.manage:read'],
    });
    prisma.user.findUnique.mockResolvedValue(owner);
    prisma.user.findUniqueOrThrow.mockResolvedValue(owner);
    prisma.authSession.findFirst.mockResolvedValue({ id: 'session' });
    prisma.settingAudit.create.mockResolvedValue({});
    prisma.apiKey.findMany.mockResolvedValue([]);
    users.list.mockResolvedValue({ items: [], pagination: { total: 0 } });
    users.create.mockResolvedValue({ id: 'student', roles: ['STUDENT'] });
  });
  afterAll(async () => {
    await app?.close();
  });
  it('lets MCP read paid-course balances but requires write scope to change reminders', async () => {
    paidCourse.summary.mockResolvedValue({ registered: 3, outstanding: 1980 });
    paidCourse.setReminders.mockResolvedValue({ remindersEnabled: false });
    prisma.apiKey.findUnique.mockResolvedValue({
      id: 'key',
      userId: 'owner',
      scopes: ['orders.manage:read'],
    });
    await request(app.getHttpServer())
      .get('/api/v1/admin/paid-course/summary')
      .set('Authorization', bearer)
      .expect(200, { registered: 3, outstanding: 1980 });
    await request(app.getHttpServer())
      .patch('/api/v1/admin/paid-course/plans/plan/reminders')
      .set('Authorization', bearer)
      .send({ remindersEnabled: false })
      .expect(403);
    prisma.apiKey.findUnique.mockResolvedValue({
      id: 'key',
      userId: 'owner',
      scopes: ['orders.manage:write'],
    });
    await request(app.getHttpServer())
      .patch('/api/v1/admin/paid-course/plans/plan/reminders')
      .set('Authorization', bearer)
      .send({ remindersEnabled: false })
      .expect(200);
    expect(paidCourse.setReminders).toHaveBeenCalledWith(
      'plan',
      false,
      'owner',
    );
  });
  it('supports bearer reads through both guards and denies unauthenticated reads', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/users')
      .set('Authorization', bearer)
      .expect(200);
    await request(app.getHttpServer()).get('/api/v1/admin/users').expect(401);
    expect(users.list).toHaveBeenCalledTimes(1);
  });
  it('denies read-only writes, validates DTOs, and allows scoped student creation', async () => {
    const payload = {
      email: 'student@example.com',
      firstName: 'Ana',
      lastName: 'Prueba',
      password: 'StrongPass123!',
    };
    await request(app.getHttpServer())
      .post('/api/v1/admin/users')
      .set('Authorization', bearer)
      .send(payload)
      .expect(403);
    prisma.apiKey.findUnique.mockResolvedValue({
      id: 'key',
      userId: 'owner',
      scopes: ['users.manage:write'],
    });
    await request(app.getHttpServer())
      .post('/api/v1/admin/users')
      .set('Authorization', bearer)
      .send({ ...payload, roles: ['SUPER_ADMIN'] })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/admin/users')
      .set('Authorization', bearer)
      .send(payload)
      .expect(201);
    expect(users.create).toHaveBeenCalledTimes(1);
  });
  it('blocks key/role management including encoded paths and accepts web sessions', async () => {
    prisma.apiKey.findUnique.mockResolvedValue({
      id: 'key',
      userId: 'owner',
      scopes: ['settings.manage:read', 'users.manage:write'],
    });
    await request(app.getHttpServer())
      .get('/api/v1/admin/settings/api-keys')
      .set('Authorization', bearer)
      .expect(403);
    await request(app.getHttpServer())
      .patch('/api/v1/admin/users/student/roles')
      .set('Authorization', bearer)
      .send({ roles: ['SUPER_ADMIN'] })
      .expect(403);
    await request(app.getHttpServer())
      .patch('/api/v1/admin/users/student/%72oles')
      .set('Authorization', bearer)
      .send({ roles: ['SUPER_ADMIN'] })
      .expect(404);
    await request(app.getHttpServer())
      .get('/api/v1/admin/settings/api-keys')
      .set('Cookie', 'lt_access=test')
      .expect(200);
    expect(users.updateRoles).not.toHaveBeenCalled();
  });
});
