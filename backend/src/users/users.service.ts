import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListUsersDto } from './dto/list-users.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}
  private select() {
    return {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      status: true,
      emailVerifiedAt: true,
      createdAt: true,
      updatedAt: true,
      roles: { select: { role: { select: { id: true, name: true } } } },
      _count: { select: { sessions: true } },
    } as const;
  }
  async list(query: ListUsersDto) {
    const where: Prisma.UserWhereInput = {
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search } },
              { firstName: { contains: query.search } },
              { lastName: { contains: query.search } },
            ],
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.role
        ? { roles: { some: { role: { name: query.role } } } }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: this.select(),
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      items: items.map((user) => ({
        ...user,
        roles: user.roles.map(({ role }) => role.name),
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.max(1, Math.ceil(total / query.limit)),
      },
    };
  }
  async get(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...this.select(),
        sessions: {
          select: {
            id: true,
            userAgent: true,
            ipAddress: true,
            expiresAt: true,
            revokedAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 25,
        },
      },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return { ...user, roles: user.roles.map(({ role }) => role.name) };
  }
  async updateStatus(id: string, status: UserStatus, actorId: string) {
    const target = await this.get(id);
    if (id === actorId && status !== UserStatus.ACTIVE)
      throw new ForbiddenException(
        'No puedes suspender o eliminar tu propia cuenta',
      );
    if (target.roles.includes('SUPER_ADMIN') && status !== UserStatus.ACTIVE)
      throw new ForbiddenException(
        'El superadministrador no puede ser suspendido',
      );
    const updated = await this.prisma.user.update({
      where: { id },
      data: { status },
      select: this.select(),
    });
    if (status !== UserStatus.ACTIVE)
      await this.prisma.authSession.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    await this.audit(actorId, 'USER_STATUS', { userId: id, status });
    return { ...updated, roles: updated.roles.map(({ role }) => role.name) };
  }
  async updateRoles(id: string, roles: string[], actorId: string) {
    const target = await this.get(id);
    if (id === actorId && !roles.includes('SUPER_ADMIN'))
      throw new ForbiddenException(
        'No puedes retirar tu propio rol de superadministrador',
      );
    if (target.roles.includes('SUPER_ADMIN') && !roles.includes('SUPER_ADMIN'))
      throw new ForbiddenException(
        'No se puede retirar el rol del superadministrador principal',
      );
    const roleRecords = await this.prisma.role.findMany({
      where: { name: { in: roles } },
    });
    if (roleRecords.length !== roles.length)
      throw new BadRequestException('Uno o más roles no existen');
    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId: id } });
      await tx.userRole.createMany({
        data: roleRecords.map((role) => ({ userId: id, roleId: role.id })),
      });
    });
    await this.audit(actorId, 'USER_ROLES', { userId: id, roles });
    return this.get(id);
  }
  async revokeSession(userId: string, sessionId: string, actorId: string) {
    const result = await this.prisma.authSession.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (!result.count)
      throw new NotFoundException('Sesión activa no encontrada');
    await this.audit(actorId, 'USER_SESSION_REVOKED', { userId, sessionId });
    return { revoked: true };
  }
  async revokeAll(userId: string, actorId: string) {
    if (userId === actorId)
      throw new ForbiddenException(
        'Utiliza cerrar sesión para revocar tu propia sesión',
      );
    const result = await this.prisma.authSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit(actorId, 'USER_SESSIONS_REVOKED', {
      userId,
      count: result.count,
    });
    return { revoked: result.count };
  }
  roles() {
    return this.prisma.role.findMany({
      select: { id: true, name: true, description: true },
      orderBy: { name: 'asc' },
    });
  }
  private audit(
    actorId: string,
    action: string,
    changes: Prisma.InputJsonObject,
  ) {
    return this.prisma.settingAudit.create({
      data: { section: 'users', action, actorId, changes },
    });
  }
}
