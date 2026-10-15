import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { verify } from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

describe('Administrative student creation', () => {
  const prisma = {
    user: { create: jest.fn() },
    settingAudit: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  const dto = {
    email: 'Ana@Example.com',
    firstName: 'Ana',
    lastName: 'Prueba',
    password: 'StrongPassword123!',
  };
  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(
      (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );
    prisma.user.create.mockResolvedValue({
      id: 'student',
      email: 'ana@example.com',
      roles: [{ role: { name: 'STUDENT' } }],
    });
  });
  it('hashes credentials, normalizes email and creates only a student without exposing the password', async () => {
    const service = new UsersService(prisma as unknown as PrismaService);
    const user = await service.create(dto, 'admin');
    const { data, select } = (
      prisma.user.create.mock.calls[0] as [
        {
          data: { passwordHash: string; email: string; roles: unknown };
          select: Record<string, unknown>;
        },
      ]
    )[0];
    expect(await verify(data.passwordHash, dto.password)).toBe(true);
    expect(data.email).toBe('ana@example.com');
    expect(data.roles).toEqual({
      create: { role: { connect: { name: 'STUDENT' } } },
    });
    expect(select.passwordHash).toBeUndefined();
    expect(user.roles).toEqual(['STUDENT']);
    expect(JSON.stringify(user)).not.toContain(dto.password);
    expect(prisma.settingAudit.create).toHaveBeenCalled();
  });
  it('reports duplicate accounts as a conflict', async () => {
    prisma.user.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: '7.8.0',
      }),
    );
    await expect(
      new UsersService(prisma as unknown as PrismaService).create(dto, 'admin'),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
