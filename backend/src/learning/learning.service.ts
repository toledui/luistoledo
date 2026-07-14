import { Injectable, NotFoundException } from '@nestjs/common';
import { EnrollmentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CertificatesService } from '../certificates/certificates.service';
import { UpdateProgressDto } from './dto/progress.dto';

@Injectable()
export class LearningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly certificates: CertificatesService,
  ) {}

  private async enrollment(userId: string, courseSlug: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId,
        course: { slug: courseSlug },
        status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] },
      },
      select: { id: true, courseId: true },
    });
    if (!enrollment)
      throw new NotFoundException('No tienes acceso activo a este curso');
    return enrollment;
  }

  async course(userId: string, slug: string) {
    const enrollment = await this.enrollment(userId, slug);
    const course = await this.prisma.course.findUnique({
      where: { id: enrollment.courseId },
      include: {
        coverMedia: true,
        instructor: { select: { firstName: true, lastName: true } },
        sections: {
          orderBy: { position: 'asc' },
          include: {
            lessons: {
              where: { isPublished: true },
              orderBy: { position: 'asc' },
              include: { media: true },
            },
          },
        },
      },
    });
    if (!course) throw new NotFoundException('Curso no encontrado');
    const [lessonProgress, courseProgress] = await Promise.all([
      this.prisma.lessonProgress.findMany({
        where: { enrollmentId: enrollment.id },
      }),
      this.prisma.courseProgress.findUnique({
        where: { enrollmentId: enrollment.id },
      }),
    ]);
    return {
      ...course,
      enrollmentId: enrollment.id,
      lessonProgress,
      courseProgress,
    };
  }

  async touch(
    userId: string,
    lessonId: string,
    dto: UpdateProgressDto,
    complete = false,
  ) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        isPublished: true,
        section: { select: { course: { select: { slug: true } } } },
      },
    });
    if (!lesson?.isPublished)
      throw new NotFoundException('Lección no disponible');
    const enrollment = await this.enrollment(
      userId,
      lesson.section.course.slug,
    );
    const now = new Date();
    await this.prisma.lessonProgress.upsert({
      where: {
        enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId },
      },
      create: {
        enrollmentId: enrollment.id,
        userId,
        lessonId,
        videoPositionSeconds: dto.videoPositionSeconds ?? 0,
        consumedSeconds: dto.consumedSeconds ?? 0,
        completed: complete,
        completedAt: complete ? now : null,
        lastAccessedAt: now,
      },
      update: {
        ...(dto.videoPositionSeconds !== undefined
          ? { videoPositionSeconds: dto.videoPositionSeconds }
          : {}),
        ...(dto.consumedSeconds !== undefined
          ? { consumedSeconds: { increment: dto.consumedSeconds } }
          : {}),
        lastAccessedAt: now,
        ...(complete ? { completed: true, completedAt: now } : {}),
      },
    });
    return this.recalculate(enrollment.id, lessonId);
  }

  private async recalculate(enrollmentId: string, lastLessonId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      select: { courseId: true },
    });
    if (!enrollment) throw new NotFoundException('Inscripción no encontrada');
    const [total, completed] = await Promise.all([
      this.prisma.lesson.count({
        where: {
          section: { courseId: enrollment.courseId },
          isPublished: true,
        },
      }),
      this.prisma.lessonProgress.count({
        where: {
          enrollmentId,
          completed: true,
          lesson: {
            section: { courseId: enrollment.courseId },
            isPublished: true,
          },
        },
      }),
    ]);
    const percentage = total ? Math.round((completed / total) * 100) : 0;
    const now = new Date();
    const courseProgress = await this.prisma.courseProgress.upsert({
      where: { enrollmentId },
      create: {
        enrollmentId,
        lastLessonId,
        percentage,
        lastAccessedAt: now,
        completedAt: percentage === 100 ? now : null,
      },
      update: {
        lastLessonId,
        percentage,
        lastAccessedAt: now,
        completedAt: percentage === 100 ? now : null,
      },
    });
    await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        status:
          percentage === 100
            ? EnrollmentStatus.COMPLETED
            : EnrollmentStatus.ACTIVE,
        completedAt: percentage === 100 ? now : null,
      },
    });
    if (percentage === 100) await this.certificates.issue(enrollmentId);
    return courseProgress;
  }
}
