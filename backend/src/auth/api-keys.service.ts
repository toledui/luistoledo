import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApiKeyDto } from './api-key.dto';

const metadata = {
  id: true,
  name: true,
  prefix: true,
  scopes: true,
  expiresAt: true,
  revokedAt: true,
  lastUsedAt: true,
  createdAt: true,
} as const;

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  async permissions(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: { permissions: { include: { permission: true } } },
            },
          },
        },
      },
    });
    if (!user || user.status !== 'ACTIVE')
      throw new UnauthorizedException('Cuenta inactiva');
    return {
      user,
      granted: new Set(
        user.roles.flatMap(({ role }) =>
          role.permissions.map(({ permission }) => permission.code),
        ),
      ),
    };
  }

  list(userId: string) {
    return this.prisma.apiKey.findMany({
      where: { userId },
      select: metadata,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, dto: CreateApiKeyDto) {
    const { granted } = await this.permissions(userId);
    if (
      dto.scopes.some(
        (scope) =>
          !granted.has(
            scope.startsWith('masterclass:')
              ? 'settings.manage'
              : scope.slice(0, scope.lastIndexOf(':')),
          ),
      )
    ) {
      throw new ForbiddenException('No puedes conceder permisos que no tienes');
    }
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : undefined;
    if (expiresAt && expiresAt <= new Date())
      throw new BadRequestException(
        'La fecha de expiración debe estar en el futuro',
      );
    const token = `lta_${randomBytes(32).toString('hex')}`;
    const key = await this.prisma.$transaction(async (tx) => {
      const key = await tx.apiKey.create({
        data: {
          name: dto.name,
          scopes: dto.scopes,
          userId,
          expiresAt,
          prefix: token.slice(0, 12),
          tokenHash: this.digest(token),
        },
        select: metadata,
      });
      await tx.settingAudit.create({
        data: {
          section: 'api-keys',
          action: 'CREATED',
          actorId: userId,
          changes: { keyId: key.id, scopes: dto.scopes },
        },
      });
      return key;
    });
    return { ...key, token };
  }

  async revoke(userId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.apiKey.updateMany({
        where: { id, userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (!result.count)
        throw new NotFoundException('Clave activa no encontrada');
      await tx.settingAudit.create({
        data: {
          section: 'api-keys',
          action: 'REVOKED',
          actorId: userId,
          changes: { keyId: id },
        },
      });
      return { revoked: true };
    });
  }

  async authenticate(
    token: string,
    required: string[],
    method: string,
    path: string,
  ) {
    if (!/^lta_[a-f0-9]{64}$/.test(token))
      throw new UnauthorizedException('API key inválida');
    const key = await this.prisma.apiKey.findUnique({
      where: { tokenHash: this.digest(token) },
    });
    if (!key || key.revokedAt || (key.expiresAt && key.expiresAt <= new Date()))
      throw new UnauthorizedException('API key inválida o expirada');
    const { user, granted } = await this.permissions(key.userId);
    // Keys only authorize explicitly permission-protected administrative routes.
    if (
      !path.startsWith('/admin/') ||
      path.startsWith('/admin/settings/api-keys') ||
      !required.length ||
      /\/users\/[^/]+\/(roles|sessions)(\/|$)/.test(path)
    ) {
      throw new ForbiddenException(
        'Esta operación requiere una sesión administrativa',
      );
    }
    const mode = ['GET', 'HEAD', 'OPTIONS'].includes(method) ? 'read' : 'write';
    const scopes = key.scopes as string[];
    const masterclass = path.startsWith('/admin/masterclass/');
    if (
      !required.every(
        (permission) =>
          granted.has(permission) &&
          scopes.includes(
            masterclass ? `masterclass:${mode}` : `${permission}:${mode}`,
          ),
      )
    ) {
      throw new ForbiddenException(
        'La API key no tiene permiso para esta operación',
      );
    }
    await this.prisma.apiKey.update({
      where: { id: key.id },
      data: { lastUsedAt: new Date() },
    });
    return { sub: user.id, email: user.email, sessionId: '', apiKeyId: key.id };
  }

  private digest(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
