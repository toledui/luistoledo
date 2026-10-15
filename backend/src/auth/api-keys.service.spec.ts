import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { ApiKeysService } from './api-keys.service';
import { PrismaService } from '../prisma/prisma.service';

describe('API key security', () => {
  const token = `lta_${'a'.repeat(64)}`;
  const prisma = {
    apiKey: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    user: { findUnique: jest.fn() },
    settingAudit: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  let service: ApiKeysService;
  beforeEach(() => {
    jest.resetAllMocks();
    prisma.apiKey.findUnique.mockResolvedValue({
      id: 'key',
      userId: 'owner',
      scopes: ['courses.manage:read'],
      revokedAt: null,
      expiresAt: null,
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 'owner',
      email: 'owner@example.com',
      status: 'ACTIVE',
      roles: [
        { role: { permissions: [{ permission: { code: 'courses.manage' } }] } },
      ],
    });
    prisma.$transaction.mockImplementation(
      (fn: (tx: typeof prisma) => unknown) => fn(prisma),
    );
    prisma.apiKey.create.mockResolvedValue({ id: 'key', name: 'Hermes' });
    service = new ApiKeysService(prisma as unknown as PrismaService);
  });
  it('allows scoped reads and hashes the provided credential for lookup', async () => {
    await expect(
      service.authenticate(token, ['courses.manage'], 'GET', '/admin/courses'),
    ).resolves.toMatchObject({ sub: 'owner', apiKeyId: 'key' });
    expect(prisma.apiKey.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: createHash('sha256').update(token).digest('hex') },
    });
    expect(prisma.apiKey.update).toHaveBeenCalled();
  });
  it('rejects writes with a read-only key and reads in other areas', async () => {
    await expect(
      service.authenticate(token, ['courses.manage'], 'POST', '/admin/courses'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.authenticate(token, ['users.manage'], 'GET', '/admin/users'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.apiKey.update).not.toHaveBeenCalled();
  });
  it.each([
    '/admin/settings/api-keys',
    '/admin/settings/api-keys/scopes',
    '/admin/users/:id/roles',
    '/admin/users/:id/sessions/revoke-all',
    '/auth/me',
  ])('rejects session-only route %s even with all scopes', async (path) => {
    prisma.apiKey.findUnique.mockResolvedValue({
      id: 'key',
      userId: 'owner',
      scopes: ['courses.manage:read', 'courses.manage:write'],
      revokedAt: null,
    });
    await expect(
      service.authenticate(token, ['courses.manage'], 'POST', path),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('rejects routes with no permission metadata', async () => {
    await expect(
      service.authenticate(token, [], 'GET', '/admin/anything'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it.each([{ revokedAt: new Date() }, { expiresAt: new Date(0) }])(
    'rejects revoked or expired keys',
    async (state) => {
      prisma.apiKey.findUnique.mockResolvedValue({
        id: 'key',
        userId: 'owner',
        ...state,
      });
      await expect(
        service.authenticate(
          token,
          ['courses.manage'],
          'GET',
          '/admin/courses',
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    },
  );
  it('rejects unknown and malformed keys', async () => {
    await expect(
      service.authenticate(
        'invalid',
        ['courses.manage'],
        'GET',
        '/admin/courses',
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.apiKey.findUnique).not.toHaveBeenCalled();
    prisma.apiKey.findUnique.mockResolvedValue(null);
    await expect(
      service.authenticate(token, ['courses.manage'], 'GET', '/admin/courses'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it('rechecks current owner status and permissions', async () => {
    prisma.user.findUnique.mockResolvedValue({ status: 'SUSPENDED' });
    await expect(
      service.authenticate(token, ['courses.manage'], 'GET', '/admin/courses'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    prisma.user.findUnique.mockResolvedValue({
      id: 'owner',
      status: 'ACTIVE',
      roles: [],
    });
    await expect(
      service.authenticate(token, ['courses.manage'], 'GET', '/admin/courses'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('isolates masterclass access from general settings', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'owner',
      status: 'ACTIVE',
      roles: [
        {
          role: { permissions: [{ permission: { code: 'settings.manage' } }] },
        },
      ],
    });
    prisma.apiKey.findUnique.mockResolvedValue({
      id: 'key',
      userId: 'owner',
      scopes: ['masterclass:read'],
    });
    await expect(
      service.authenticate(
        token,
        ['settings.manage'],
        'GET',
        '/admin/masterclass/registrations',
      ),
    ).resolves.toMatchObject({ sub: 'owner' });
    await expect(
      service.authenticate(
        token,
        ['settings.manage'],
        'GET',
        '/admin/settings/general',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('returns a random secret once and never persists its plaintext', async () => {
    const result = await service.create('owner', {
      name: 'Hermes',
      scopes: ['courses.manage:read'],
    });
    expect(result.token).toMatch(/^lta_[a-f0-9]{64}$/);
    const data = (
      prisma.apiKey.create.mock.calls[0] as [{ data: { tokenHash: string } }]
    )[0].data;
    expect(data.tokenHash).toBe(
      createHash('sha256').update(result.token).digest('hex'),
    );
    expect(JSON.stringify(data)).not.toContain(result.token);
  });
  it('cannot mint permissions the owner lacks or already expired keys', async () => {
    await expect(
      service.create('owner', {
        name: 'Hermes',
        scopes: ['users.manage:write'],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.create('owner', {
        name: 'Hermes',
        scopes: ['courses.manage:read'],
        expiresAt: '2000-01-01T00:00:00Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.apiKey.create).not.toHaveBeenCalled();
  });
  it('restricts revocation and listing to the owner, excluding credential hashes', async () => {
    prisma.apiKey.updateMany.mockResolvedValue({ count: 1 });
    await service.revoke('owner', 'key');
    expect(prisma.apiKey.updateMany).toHaveBeenCalledWith({
      where: { id: 'key', userId: 'owner', revokedAt: null },
      data: { revokedAt: expect.any(Date) as Date },
    });
  });
});
