import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { ApiKeysService } from './api-keys.service';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedRequest } from './authenticated-request';
import type { AccessTokenPayload } from './auth.types';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
    private readonly keys: ApiKeysService,
  ) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    if (authorization !== undefined) {
      if (!authorization.startsWith('Bearer '))
        throw new UnauthorizedException('Usa Authorization: Bearer <API_KEY>');
      const required =
        this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
          context.getHandler(),
          context.getClass(),
        ]) ?? [];
      const prefix =
        '/' +
        this.config
          .get<string>('API_PREFIX', 'api/v1')
          .replace(/^\/+|\/+$/g, '');
      const routePath =
        (request.route as { path?: string } | undefined)?.path ?? '';
      const path = routePath.startsWith(prefix + '/')
        ? routePath.slice(prefix.length)
        : routePath;
      request.auth = await this.keys.authenticate(
        authorization.slice(7),
        required,
        request.method,
        path,
      );
      request.res?.once('finish', () => {
        void this.prisma.settingAudit
          .create({
            data: {
              section: 'agent-api',
              action: `${request.method} ${path}`,
              actorId: request.auth.sub,
              changes: {
                keyId: request.auth.apiKeyId!,
                status: request.res!.statusCode,
              },
              ipAddress: request.ip,
            },
          })
          .catch(() => undefined);
      });
      return true;
    }
    const token = request.cookies?.[
      this.config.get<string>('COOKIE_ACCESS_NAME', 'lt_access')
    ] as string | undefined;
    if (!token) throw new UnauthorizedException('Autenticación requerida');
    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      const session = await this.prisma.authSession.findFirst({
        where: {
          id: payload.sessionId,
          userId: payload.sub,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      });
      if (!session) throw new Error('revoked');
      request.auth = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Sesión inválida o expirada');
    }
  }
}
