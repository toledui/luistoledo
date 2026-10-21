import {
  Injectable,
  Logger,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { mergeMap } from 'rxjs/operators';
import { ConfigService } from '@nestjs/config';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from './analytics.service';

@Injectable()
export class AnalyticsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AnalyticsInterceptor.name);
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}
  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const sessionId = req.header('x-lta-session');
    const startedAt = Date.now();
    if (
      !sessionId ||
      req.method === 'GET' ||
      !/^[a-zA-Z0-9.-]{16,64}$/.test(sessionId)
    )
      return next.handle();
    return next.handle().pipe(
      mergeMap(async (result: unknown) => {
        try {
          const prefix =
            '/' +
            this.config
              .get<string>('API_PREFIX', 'api/v1')
              .replace(/^\/+|\/+$/g, '');
          const path = req.path.startsWith(prefix + '/')
            ? req.path.slice(prefix.length)
            : req.path;
          if (
            !result ||
            typeof result !== 'object' ||
            path.startsWith('/admin')
          )
            return result;
          const data = result as Record<string, unknown>;
          let name: string | undefined;
          let id: string | undefined;
          let userId: string | undefined;
          if (path === '/auth/register' || path === '/auth/checkout-account') {
            const body = req.body as { email?: string };
            const user = body.email
              ? await this.prisma.user.findUnique({
                  where: { email: body.email.trim().toLowerCase() },
                  select: { id: true },
                })
              : null;
            name = 'sign_up';
            id = user?.id;
            userId = user?.id;
          } else if (path === '/auth/login') {
            const user = data.user as { id?: string } | undefined;
            name = 'login';
            userId = user?.id;
            id = userId ? `${userId}.${sessionId}` : undefined;
          } else if (path === '/contacts') {
            name = 'generate_lead';
            id = typeof data.id === 'string' ? data.id : undefined;
          } else if (path === '/masterclass/registrations') {
            const body = req.body as { email?: string };
            const registration = body.email
              ? await this.prisma.masterclassRegistration.findFirst({
                  where: { email: body.email.trim().toLowerCase() },
                  orderBy: { createdAt: 'desc' },
                  select: { id: true, createdAt: true },
                })
              : null;
            name = 'generate_lead';
            id =
              registration && registration.createdAt.getTime() >= startedAt
                ? registration.id
                : undefined;
          } else if (/^\/learning\/lessons\/[^/]+\/complete$/.test(path)) {
            name = 'lesson_complete';
            id = `${req.auth.sub}.${String(req.params.id)}`;
            userId = req.auth.sub;
          }
          if (name && id) {
            const event = await this.analytics.confirmed(
              name,
              id,
              sessionId,
              name === 'login'
                ? '/login'
                : name === 'lesson_complete'
                  ? '/aprender'
                  : name === 'generate_lead'
                    ? path === '/contacts'
                      ? '/contacto'
                      : '/masterclass'
                    : path === '/auth/register'
                      ? '/registro'
                      : '/checkout',
              userId,
            );
            if (event) return { ...data, analyticsEvent: event };
          }
        } catch {
          this.logger.warn(
            'No se pudo registrar la conversión; la operación principal fue completada.',
          );
        }
        return result;
      }),
    );
  }
}
