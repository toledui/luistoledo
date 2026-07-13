import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';
import { hash, verify } from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { AccessTokenPayload, AuthUser } from './auth.types';

type SessionContext = { ipAddress?: string; userAgent?: string };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async enqueueTemplate(
    event: string,
    recipient: string,
    values: Record<string, string>,
  ) {
    const template = await this.prisma.emailTemplate.findUnique({
      where: { event_locale: { event, locale: 'es-MX' } },
    });
    if (!template?.enabled) return;
    const render = (content: string) =>
      content.replace(
        /{{\s*([a-zA-Z0-9_]+)\s*}}/g,
        (_, key: string) => values[key] ?? '',
      );
    await this.prisma.emailQueue.create({
      data: {
        recipient,
        subject: render(template.subject),
        htmlContent: render(template.htmlContent),
        textContent: render(template.textContent),
        event,
        maxAttempts: 3,
      },
    });
  }

  async register(input: {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
  }) {
    const email = input.email.toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } }))
      throw new ConflictException(
        'No fue posible crear la cuenta con esos datos',
      );
    const role = await this.prisma.role.findUniqueOrThrow({
      where: { name: 'STUDENT' },
    });
    const token = randomBytes(32).toString('base64url');
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          firstName: input.firstName,
          lastName: input.lastName,
          passwordHash: await hash(input.password),
          status: UserStatus.PENDING_VERIFICATION,
          roles: { create: { roleId: role.id } },
        },
      });
      await tx.emailVerificationToken.create({
        data: {
          userId: created.id,
          tokenHash: this.hashToken(token),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      return created;
    });
    const frontend = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    await this.enqueueTemplate('VERIFY_EMAIL', email, {
      student_name: user.firstName,
      verification_url: `${frontend}/verificar-email?token=${encodeURIComponent(token)}`,
      academy_name: 'Luis Toledo Academy',
    });
    return { registered: true, verificationRequired: true };
  }

  async verifyEmail(token: string) {
    const record = await this.prisma.emailVerificationToken.findFirst({
      where: {
        tokenHash: this.hashToken(token),
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });
    if (!record) throw new UnauthorizedException('Token inválido o expirado');
    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: { status: UserStatus.ACTIVE, emailVerifiedAt: new Date() },
      }),
    ]);
    await this.enqueueTemplate('WELCOME', record.user.email, {
      student_name: record.user.firstName,
      academy_name: 'Luis Toledo Academy',
    });
    return { verified: true };
  }

  async resendVerification(emailInput: string) {
    const email = emailInput.toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user?.status === UserStatus.PENDING_VERIFICATION) {
      await this.prisma.emailVerificationToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      const token = randomBytes(32).toString('base64url');
      await this.prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash: this.hashToken(token),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      const frontend = this.config.get<string>(
        'FRONTEND_URL',
        'http://localhost:3000',
      );
      await this.enqueueTemplate('VERIFY_EMAIL', email, {
        student_name: user.firstName,
        verification_url: `${frontend}/verificar-email?token=${encodeURIComponent(token)}`,
        academy_name: 'Luis Toledo Academy',
      });
    }
    return { accepted: true };
  }

  async forgotPassword(emailInput: string) {
    const email = emailInput.toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user?.status === UserStatus.ACTIVE) {
      await this.prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      const token = randomBytes(32).toString('base64url');
      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: this.hashToken(token),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
      const frontend = this.config.get<string>(
        'FRONTEND_URL',
        'http://localhost:3000',
      );
      await this.enqueueTemplate('RESET_PASSWORD', email, {
        student_name: user.firstName,
        reset_password_url: `${frontend}/restablecer-contrasena?token=${encodeURIComponent(token)}`,
        academy_name: 'Luis Toledo Academy',
      });
    }
    return { accepted: true };
  }

  async resetPassword(token: string, password: string) {
    const record = await this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash: this.hashToken(token),
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!record) throw new UnauthorizedException('Token inválido o expirado');
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash: await hash(password) },
      }),
      this.prisma.authSession.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { passwordReset: true };
  }

  private async userProfile(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUniqueOrThrow({
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
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles.map(({ role }) => role.name),
      permissions: [
        ...new Set(
          user.roles.flatMap(({ role }) =>
            role.permissions.map(({ permission }) => permission.code),
          ),
        ),
      ],
    };
  }

  private accessToken(payload: AccessTokenPayload) {
    return this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>(
        'JWT_ACCESS_TTL',
        '15m',
      ) as `${number}${'s' | 'm' | 'h' | 'd'}`,
    });
  }

  async login(email: string, password: string, context: SessionContext) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (
      !user ||
      user.status !== UserStatus.ACTIVE ||
      !(await verify(user.passwordHash, password))
    ) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }
    const refreshToken = randomBytes(48).toString('base64url');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const session = await this.prisma.authSession.create({
      data: {
        userId: user.id,
        refreshTokenHash: this.hashToken(refreshToken),
        expiresAt,
        ...context,
      },
    });
    const accessToken = await this.accessToken({
      sub: user.id,
      email: user.email,
      sessionId: session.id,
    });
    return {
      accessToken,
      refreshToken,
      refreshExpiresAt: expiresAt,
      user: await this.userProfile(user.id),
    };
  }

  async refresh(refreshToken: string, context: SessionContext) {
    const session = await this.prisma.authSession.findFirst({
      where: {
        refreshTokenHash: this.hashToken(refreshToken),
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });
    if (!session || session.user.status !== UserStatus.ACTIVE)
      throw new UnauthorizedException('Sesión inválida');
    const nextToken = randomBytes(48).toString('base64url');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.authSession.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: this.hashToken(nextToken),
        expiresAt,
        ...context,
      },
    });
    const accessToken = await this.accessToken({
      sub: session.userId,
      email: session.user.email,
      sessionId: session.id,
    });
    return {
      accessToken,
      refreshToken: nextToken,
      refreshExpiresAt: expiresAt,
    };
  }

  me(userId: string) {
    return this.userProfile(userId);
  }

  logout(sessionId: string) {
    return this.prisma.authSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  logoutAll(userId: string) {
    return this.prisma.authSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
