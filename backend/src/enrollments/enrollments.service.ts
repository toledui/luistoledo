import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CourseLevel,
  CourseStatus,
  EnrollmentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CatalogQueryDto } from './dto/enrollment.dto';

@Injectable()
export class EnrollmentsService {
  constructor(private readonly prisma: PrismaService) {}
  catalog(query: CatalogQueryDto) {
    const level = Object.values(CourseLevel).includes(
      query.level as CourseLevel,
    )
      ? (query.level as CourseLevel)
      : undefined;
    return this.prisma.course.findMany({
      where: {
        status: CourseStatus.PUBLISHED,
        ...(query.search
          ? {
              OR: [
                { title: { contains: query.search } },
                { shortDescription: { contains: query.search } },
              ],
            }
          : {}),
        ...(query.category ? { category: { slug: query.category } } : {}),
        ...(level ? { level } : {}),
      },
      orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }],
      include: {
        category: true,
        coverMedia: true,
        instructor: { select: { firstName: true, lastName: true } },
        _count: { select: { sections: true, enrollments: true } },
      },
    });
  }
  categories() {
    return this.prisma.category.findMany({
      where: { courses: { some: { status: CourseStatus.PUBLISHED } } },
      orderBy: { name: 'asc' },
    });
  }
  async enrollFree(userId: string, courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course || course.status !== CourseStatus.PUBLISHED)
      throw new NotFoundException('Curso no disponible');
    if (Number(course.salePrice ?? course.price) > 0)
      throw new BadRequestException('Este curso requiere una compra');
    const existing = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (existing?.status === EnrollmentStatus.ACTIVE)
      throw new ConflictException('Ya estás inscrito en este curso');
    return this.prisma.enrollment.upsert({
      where: { userId_courseId: { userId, courseId } },
      update: { status: EnrollmentStatus.ACTIVE, source: 'FREE' },
      create: {
        userId,
        courseId,
        status: EnrollmentStatus.ACTIVE,
        source: 'FREE',
      },
    });
  }
  mine(userId: string) {
    return this.prisma.enrollment.findMany({
      where: {
        userId,
        status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] },
      },
      orderBy: { enrolledAt: 'desc' },
      include: {
        course: {
          include: {
            coverMedia: true,
            category: true,
            _count: { select: { sections: true } },
          },
        },
      },
    });
  }
  listCourse(courseId: string) {
    return this.prisma.enrollment.findMany({
      where: { courseId },
      orderBy: { enrolledAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            status: true,
          },
        },
      },
    });
  }
  async adminEnroll(courseId: string, userId: string) {
    const [course, user] = await Promise.all([
      this.prisma.course.findUnique({ where: { id: courseId } }),
      this.prisma.user.findUnique({ where: { id: userId } }),
    ]);
    if (!course || !user)
      throw new NotFoundException('Curso o usuario no encontrado');
    return this.prisma.enrollment.upsert({
      where: { userId_courseId: { userId, courseId } },
      update: { status: EnrollmentStatus.ACTIVE, source: 'MANUAL' },
      create: {
        userId,
        courseId,
        status: EnrollmentStatus.ACTIVE,
        source: 'MANUAL',
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            status: true,
          },
        },
      },
    });
  }
  update(id: string, status: EnrollmentStatus) {
    return this.prisma.enrollment.update({
      where: { id },
      data: {
        status,
        ...(status === EnrollmentStatus.COMPLETED
          ? { completedAt: new Date() }
          : {}),
      },
    });
  }
  async remove(id: string) {
    try {
      await this.prisma.enrollment.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      )
        throw new NotFoundException('Inscripción no encontrada');
      throw error;
    }
    return { deleted: true };
  }
}
