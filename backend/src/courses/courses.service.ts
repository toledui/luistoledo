import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CourseStatus, EnrollmentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCourseDto,
  CreateLessonDto,
  CreateSectionDto,
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
        include: { media: true },
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
      include: detailInclude,
    });
    if (!course)
      throw new NotFoundException(
        'No tienes una inscripción activa en este curso',
      );
    return { ...course, adminPreview: false, enrolled: true };
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
      data: { sectionId, title: dto.title, type: dto.type, position },
    });
  }
  updateLesson(id: string, dto: UpdateLessonDto) {
    return this.prisma.lesson.update({ where: { id }, data: dto });
  }
  async removeLesson(id: string) {
    await this.prisma.lesson.delete({ where: { id } });
    return { deleted: true };
  }
}
