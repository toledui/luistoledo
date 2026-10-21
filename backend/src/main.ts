import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import express from 'express';
import { join } from 'node:path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 4000);
  const prefix = config.get<string>('API_PREFIX', 'api/v1');
  const trustedProxies = config.get<string>('TRUSTED_PROXY_CIDRS');
  if (trustedProxies) {
    const server = app.getHttpAdapter().getInstance() as express.Express;
    server.set(
      'trust proxy',
      trustedProxies
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    );
  }
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));
  app.use(cookieParser());
  app.enableCors({
    origin: config.get<string>('FRONTEND_URL', 'http://localhost:3000'),
    credentials: true,
  });
  app.setGlobalPrefix(prefix);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Luis Toledo Academy API')
    .setDescription('API REST para la plataforma educativa Luis Toledo Academy')
    .setVersion('1.0')
    .addCookieAuth('lt_access')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      description: 'API key creada en Configuración → API y agentes',
    })
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  for (const [path, item] of Object.entries(document.paths)) {
    if (!path.startsWith(`/${prefix.replace(/^\/+|\/+$/g, '')}/admin/`))
      continue;
    const sessionOnly =
      path.includes('/admin/settings/api-keys') ||
      /\/users\/[^/]+\/(roles|sessions)(\/|$)/.test(path);
    for (const method of ['get', 'post', 'patch', 'put', 'delete'] as const) {
      const operation = item?.[method];
      if (operation)
        operation.security = sessionOnly
          ? [{ cookie: [] }]
          : [{ bearer: [] }, { cookie: [] }];
    }
  }
  SwaggerModule.setup('api/docs', app, document);
  await app.listen(port);
}
void bootstrap();
