import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CoursesService } from './courses.service';

describe('CoursesService', () => {
  const prisma = {
    lesson: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    mediaAsset: {
      findUnique: jest.fn(),
    },
    lessonResource: {
      count: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  let service: CoursesService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.lesson.update.mockResolvedValue({});
    prisma.lesson.findUnique.mockResolvedValue({ id: 'lesson-1' });
    prisma.lessonResource.count.mockResolvedValue(0);
    prisma.lessonResource.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'resource-1', ...data }),
    );
    prisma.$transaction.mockResolvedValue([]);
    service = new CoursesService(prisma as unknown as PrismaService);
  });

  it('guarda la posición de todas las lecciones en una transacción', async () => {
    prisma.lesson.findMany.mockResolvedValue([
      { id: 'lesson-1' },
      { id: 'lesson-2' },
    ]);

    await expect(
      service.reorderLessons('section-1', {
        lessonIds: ['lesson-2', 'lesson-1'],
      }),
    ).resolves.toEqual({ reordered: true });

    expect(prisma.lesson.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'lesson-2' },
      data: { position: 0 },
    });
    expect(prisma.lesson.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'lesson-1' },
      data: { position: 1 },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('rechaza un orden incompleto o con lecciones de otro módulo', async () => {
    prisma.lesson.findMany.mockResolvedValue([
      { id: 'lesson-1' },
      { id: 'lesson-2' },
    ]);

    await expect(
      service.reorderLessons('section-1', {
        lessonIds: ['lesson-1', 'lesson-3'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('agrega varios enlaces HTTPS como recursos independientes', async () => {
    await service.createLessonResource('lesson-1', {
      title: 'Documentación',
      url: 'https://example.com/docs',
    });
    prisma.lessonResource.count.mockResolvedValue(1);
    await service.createLessonResource('lesson-1', {
      title: 'Ejemplos',
      url: 'https://example.com/examples',
    });

    expect(prisma.lessonResource.create).toHaveBeenNthCalledWith(1, {
      data: {
        lessonId: 'lesson-1',
        title: 'Documentación',
        kind: 'LINK',
        url: 'https://example.com/docs',
        mediaId: null,
        position: 0,
      },
      include: { media: true },
    });
    expect(prisma.lessonResource.create).toHaveBeenNthCalledWith(2, {
      data: {
        lessonId: 'lesson-1',
        title: 'Ejemplos',
        kind: 'LINK',
        url: 'https://example.com/examples',
        mediaId: null,
        position: 1,
      },
      include: { media: true },
    });
  });

  it('asocia una imagen de la biblioteca como recurso', async () => {
    prisma.mediaAsset.findUnique.mockResolvedValue({ kind: 'IMAGE' });

    await service.createLessonResource('lesson-1', {
      title: 'Infografía',
      mediaId: 'media-1',
    });

    expect(prisma.lessonResource.create).toHaveBeenCalledWith({
      data: {
        lessonId: 'lesson-1',
        title: 'Infografía',
        mediaId: 'media-1',
        kind: 'IMAGE',
        url: null,
        position: 0,
      },
      include: { media: true },
    });
  });

  it('rechaza enlaces sin HTTPS', async () => {
    await expect(
      service.createLessonResource('lesson-1', {
        title: 'Enlace inseguro',
        url: 'http://example.com',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.lessonResource.create).not.toHaveBeenCalled();
  });
});
