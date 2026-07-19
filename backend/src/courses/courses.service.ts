import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CourseLevel,
  CourseStatus,
  EnrollmentStatus,
  LessonResourceKind,
  MediaKind,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCourseDto,
  CreateLessonDto,
  CreateLessonResourceDto,
  CreateSectionDto,
  ReorderLessonsDto,
  UpdateCourseDto,
  UpdateLessonDto,
  UpdateSectionDto,
} from './dto/course.dto';

const detailInclude = {
  category: true,
  coverMedia: true,
  instructor: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  sections: {
    orderBy: { position: 'asc' as const },
    include: {
      lessons: {
        orderBy: { position: 'asc' as const },
        include: {
          media: true,
          resources: {
            orderBy: { position: 'asc' as const },
            include: { media: true },
          },
        },
      },
    },
  },
} satisfies Prisma.CourseInclude;

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}
  private slug(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
  private async uniqueSlug(value: string, exceptId?: string) {
    const base = this.slug(value) || `curso-${Date.now()}`;
    let candidate = base;
    let index = 2;
    while (
      await this.prisma.course.findFirst({
        where: {
          slug: candidate,
          ...(exceptId ? { id: { not: exceptId } } : {}),
        },
        select: { id: true },
      })
    )
      candidate = `${base}-${index++}`;
    return candidate;
  }
  private screenPalUrl(value: string | null) {
    if (!value?.trim()) return null;
    let url: URL;
    try {
      url = new URL(value.trim());
    } catch {
      throw new BadRequestException(
        'El video de presentación debe contener una URL válida',
      );
    }
    const host = url.hostname.toLowerCase();
    if (
      url.protocol !== 'https:' ||
      (host !== 'screenpal.com' && !host.endsWith('.screenpal.com'))
    )
      throw new BadRequestException(
        'El video de presentación debe ser un embed HTTPS de ScreenPal',
      );
    return url.toString();
  }
  list() {
    return this.prisma.course.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        category: true,
        coverMedia: true,
        _count: { select: { sections: true } },
      },
    });
  }
  publicList(filters: {
    search?: string;
    category?: string;
    level?: string;
    limit?: string;
  }) {
    const requestedLimit = Number(filters.limit || 100);
    const take = Number.isFinite(requestedLimit)
      ? Math.min(100, Math.max(1, requestedLimit))
      : 100;
    return this.prisma.course.findMany({
      where: {
        status: CourseStatus.PUBLISHED,
        ...(filters.search
          ? {
              OR: [
                { title: { contains: filters.search } },
                { subtitle: { contains: filters.search } },
                { shortDescription: { contains: filters.search } },
              ],
            }
          : {}),
        ...(filters.category ? { category: { slug: filters.category } } : {}),
        ...(filters.level &&
        Object.values(CourseLevel).includes(filters.level as CourseLevel)
          ? { level: filters.level as CourseLevel }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        category: true,
        coverMedia: true,
        _count: { select: { sections: true, enrollments: true } },
      },
    });
  }
  metadata() {
    return Promise.all([
      this.prisma.category.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.mediaAsset.findMany({
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, firstName: true, lastName: true, email: true },
        orderBy: { firstName: 'asc' },
      }),
    ]).then(([categories, media, instructors]) => ({
      categories,
      media,
      images: media.filter((asset) => asset.kind === 'IMAGE'),
      instructors,
    }));
  }
  async get(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: detailInclude,
    });
    if (!course) throw new NotFoundException('Curso no encontrado');
    return course;
  }
  async previewBySlug(slug: string) {
    const course = await this.prisma.course.findUnique({
      where: { slug },
      include: detailInclude,
    });
    if (!course) throw new NotFoundException('Curso no encontrado');
    return { ...course, adminPreview: true };
  }
  async publicBySlug(slug: string) {
    const course = await this.prisma.course.findFirst({
      where: { slug, status: CourseStatus.PUBLISHED },
      include: detailInclude,
    });
    if (!course) throw new NotFoundException('Curso no encontrado');
    return {
      ...course,
      adminPreview: false,
      sections: course.sections.map((section) => ({
        ...section,
        lessons: section.lessons.map((lesson) => ({
          ...lesson,
          content: lesson.isPreview ? lesson.content : null,
          media: lesson.isPreview ? lesson.media : null,
          mediaId: lesson.isPreview ? lesson.mediaId : null,
          resources: lesson.isPreview ? lesson.resources : [],
        })),
      })),
    };
  }
  async enrolledBySlug(slug: string, userId: string) {
    const course = await this.prisma.course.findFirst({
      where: {
        slug,
        status: CourseStatus.PUBLISHED,
        enrollments: {
          some: {
            userId,
            status: {
              in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED],
            },
          },
        },
      },
      include: {
        ...detailInclude,
        enrollments: {
          where: {
            userId,
            status: {
              in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED],
            },
          },
          take: 1,
          include: { courseProgress: true },
        },
      },
    });
    if (!course)
      throw new NotFoundException(
        'No tienes una inscripción activa en este curso',
      );
    const enrollment = course.enrollments[0];
    return {
      ...course,
      enrollments: undefined,
      adminPreview: false,
      enrolled: true,
      startLessonId: enrollment?.courseProgress?.lastLessonId || null,
      progressPercentage: enrollment?.courseProgress?.percentage || 0,
    };
  }
  async create(dto: CreateCourseDto, actorId: string) {
    return this.prisma.course.create({
      data: {
        title: dto.title,
        slug: await this.uniqueSlug(dto.slug || dto.title),
        createdById: actorId,
        instructorId: actorId,
      },
    });
  }
  async update(id: string, dto: UpdateCourseDto) {
    await this.get(id);
    const data: Prisma.CourseUpdateInput = {
      ...dto,
      ...(dto.presentationVideoUrl !== undefined
        ? { presentationVideoUrl: this.screenPalUrl(dto.presentationVideoUrl) }
        : {}),
      ...(dto.slug ? { slug: await this.uniqueSlug(dto.slug, id) } : {}),
      ...(dto.status === CourseStatus.PUBLISHED
        ? { publishedAt: new Date() }
        : {}),
    };
    if (
      dto.salePrice != null &&
      dto.price != null &&
      dto.salePrice >= dto.price
    )
      throw new BadRequestException(
        'El precio promocional debe ser menor al precio normal',
      );
    return this.prisma.course.update({
      where: { id },
      data,
      include: detailInclude,
    });
  }
  async duplicate(id: string, actorId: string) {
    const source = await this.get(id);
    return this.prisma.course.create({
      data: {
        title: `${source.title} (copia)`,
        slug: await this.uniqueSlug(`${source.slug}-copia`),
        subtitle: source.subtitle,
        shortDescription: source.shortDescription,
        description: source.description,
        objectives: source.objectives,
        requirements: source.requirements,
        presentationVideoUrl: source.presentationVideoUrl,
        level: source.level,
        language: source.language,
        price: source.price,
        salePrice: source.salePrice,
        estimatedMinutes: source.estimatedMinutes,
        categoryId: source.categoryId,
        coverMediaId: source.coverMediaId,
        instructorId: source.instructorId,
        createdById: actorId,
        sections: {
          create: source.sections.map((section) => ({
            title: section.title,
            description: section.description,
            position: section.position,
            lessons: {
              create: section.lessons.map((lesson) => ({
                title: lesson.title,
                type: lesson.type,
                content: lesson.content,
                mediaId: lesson.mediaId,
                durationMinutes: lesson.durationMinutes,
                position: lesson.position,
                isPreview: lesson.isPreview,
                isPublished: false,
                resources: {
                  create: lesson.resources.map((resource) => ({
                    title: resource.title,
                    kind: resource.kind,
                    url: resource.url,
                    mediaId: resource.mediaId,
                    position: resource.position,
                  })),
                },
              })),
            },
          })),
        },
      },
    });
  }
  async remove(id: string) {
    await this.get(id);
    await this.prisma.course.delete({ where: { id } });
    return { deleted: true };
  }
  async createSection(courseId: string, dto: CreateSectionDto) {
    await this.get(courseId);
    const position = await this.prisma.courseSection.count({
      where: { courseId },
    });
    return this.prisma.courseSection.create({
      data: {
        courseId,
        title: dto.title,
        description: dto.description,
        position,
      },
    });
  }
  updateSection(id: string, dto: UpdateSectionDto) {
    return this.prisma.courseSection.update({ where: { id }, data: dto });
  }
  async removeSection(id: string) {
    await this.prisma.courseSection.delete({ where: { id } });
    return { deleted: true };
  }
  async createLesson(sectionId: string, dto: CreateLessonDto) {
    const position = await this.prisma.lesson.count({ where: { sectionId } });
    return this.prisma.lesson.create({
      data: {
        sectionId,
        title: dto.title,
        type: dto.type,
        position,
        isPublished: true,
      },
    });
  }
  async reorderLessons(sectionId: string, dto: ReorderLessonsDto) {
    const lessons = await this.prisma.lesson.findMany({
      where: { sectionId },
      select: { id: true },
    });
    const currentIds = new Set(lessons.map((lesson) => lesson.id));
    const hasExactLessonSet =
      lessons.length === dto.lessonIds.length &&
      new Set(dto.lessonIds).size === dto.lessonIds.length &&
      dto.lessonIds.every((lessonId) => currentIds.has(lessonId));

    if (!hasExactLessonSet)
      throw new BadRequestException(
        'El orden debe incluir todas las lecciones del módulo',
      );

    await this.prisma.$transaction(
      dto.lessonIds.map((lessonId, position) =>
        this.prisma.lesson.update({
          where: { id: lessonId },
          data: { position },
        }),
      ),
    );

    return { reordered: true };
  }
  updateLesson(id: string, dto: UpdateLessonDto) {
    return this.prisma.lesson.update({ where: { id }, data: dto });
  }
  async createLessonResource(lessonId: string, dto: CreateLessonResourceDto) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true },
    });
    if (!lesson) throw new NotFoundException('Lección no encontrada');
    if (!dto.title.trim())
      throw new BadRequestException('Escribe el nombre del recurso');

    const url = dto.url?.trim();
    const mediaId = dto.mediaId?.trim();
    if ((!url && !mediaId) || (url && mediaId))
      throw new BadRequestException(
        'Selecciona un enlace o un archivo para el recurso',
      );

    let kind: LessonResourceKind = LessonResourceKind.LINK;
    if (url) {
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        throw new BadRequestException('Ingresa un enlace válido');
      }
      if (parsed.protocol !== 'https:')
        throw new BadRequestException('El enlace debe usar HTTPS');
    } else {
      const media = await this.prisma.mediaAsset.findUnique({
        where: { id: mediaId },
        select: { kind: true },
      });
      if (!media || media.kind === MediaKind.VIDEO_EMBED)
        throw new BadRequestException('Selecciona un PDF o una imagen válida');
      kind =
        media.kind === MediaKind.IMAGE
          ? LessonResourceKind.IMAGE
          : LessonResourceKind.DOCUMENT;
    }

    const position = await this.prisma.lessonResource.count({
      where: { lessonId },
    });
    return this.prisma.lessonResource.create({
      data: {
        lessonId,
        title: dto.title.trim(),
        kind,
        url: url || null,
        mediaId: mediaId || null,
        position,
      },
      include: { media: true },
    });
  }
  async removeLessonResource(id: string) {
    await this.prisma.lessonResource.delete({ where: { id } });
    return { deleted: true };
  }
  async removeLesson(id: string) {
    await this.prisma.lesson.delete({ where: { id } });
    return { deleted: true };
  }
}
