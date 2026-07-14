import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CertificateStatus, EnrollmentStatus, Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import PDFDocument from 'pdfkit';
import { EmailTemplateService } from '../email-templates/email-template.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CertificatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly templates: EmailTemplateService,
  ) {}

  async issue(enrollmentId: string) {
    const existing = await this.prisma.certificate.findUnique({
      where: { enrollmentId },
    });
    if (existing) return existing;
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        user: true,
        course: {
          include: {
            instructor: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!enrollment || enrollment.status !== EnrollmentStatus.COMPLETED)
      throw new NotFoundException('El curso todavía no está completado');

    const issuedAt = new Date();
    const token = randomBytes(16).toString('hex').toUpperCase();
    const verificationCode = createHash('sha256')
      .update(`${enrollment.id}:${token}`)
      .digest('hex')
      .slice(0, 24)
      .toUpperCase();
    const folio = `LTA-${issuedAt.getFullYear()}-${token.slice(0, 10)}`;
    const directory = join(process.cwd(), 'uploads', 'certificates');
    await mkdir(directory, { recursive: true });
    const filename = `${verificationCode}.pdf`;
    const filePath = join(directory, filename);
    await this.generatePdf(filePath, {
      academy: 'Luis Toledo Academy',
      student: `${enrollment.user.firstName} ${enrollment.user.lastName}`,
      course: enrollment.course.title,
      instructor: enrollment.course.instructor
        ? `${enrollment.course.instructor.firstName} ${enrollment.course.instructor.lastName}`
        : 'Luis Toledo',
      duration: enrollment.course.estimatedMinutes,
      folio,
      verificationCode,
      issuedAt,
    });
    const backendUrl = this.config
      .get<string>('BACKEND_PUBLIC_URL', 'http://localhost:4000')
      .replace(/\/$/, '');
    let certificate;
    try {
      certificate = await this.prisma.certificate.create({
        data: {
          enrollmentId,
          userId: enrollment.userId,
          courseId: enrollment.courseId,
          folio,
          verificationCode,
          pdfUrl: `${backendUrl}/uploads/certificates/${filename}`,
          issuedAt,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        return this.prisma.certificate.findUniqueOrThrow({
          where: { enrollmentId },
        });
      throw error;
    }
    const frontendUrl = this.config
      .get<string>('FRONTEND_URL', 'http://localhost:3000')
      .replace(/\/$/, '');
    const values = {
      student_name: enrollment.user.firstName,
      student_email: enrollment.user.email,
      course_name: enrollment.course.title,
      course_url: `${frontendUrl}/aprender/${enrollment.course.slug}/inicio`,
      certificate_url: `${frontendUrl}/certificados/verificar/${verificationCode}`,
    };
    await Promise.allSettled([
      this.templates.sendEvent(
        'COURSE_COMPLETED',
        enrollment.user.email,
        values,
      ),
      this.templates.sendEvent(
        'CERTIFICATE_GENERATED',
        enrollment.user.email,
        values,
        [
          {
            filename: `Certificado-${enrollment.course.slug}.pdf`,
            path: filePath,
            contentType: 'application/pdf',
          },
        ],
      ),
    ]);
    return certificate;
  }

  async mine(userId: string) {
    const missing = await this.prisma.enrollment.findMany({
      where: {
        userId,
        status: EnrollmentStatus.COMPLETED,
        certificate: null,
      },
      select: { id: true },
    });
    await Promise.all(missing.map((item) => this.issue(item.id)));
    return this.prisma.certificate.findMany({
      where: { userId },
      orderBy: { issuedAt: 'desc' },
      include: {
        course: { select: { title: true, slug: true, coverMedia: true } },
      },
    });
  }

  async verify(code: string) {
    const certificate = await this.prisma.certificate.findUnique({
      where: { verificationCode: code.toUpperCase() },
      include: {
        user: { select: { firstName: true, lastName: true } },
        course: {
          select: {
            title: true,
            estimatedMinutes: true,
            instructor: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!certificate) throw new NotFoundException('Certificado no encontrado');
    return certificate;
  }

  async file(userId: string, id: string) {
    const certificate = await this.prisma.certificate.findFirst({
      where: { id, userId, status: CertificateStatus.ACTIVE },
    });
    if (!certificate) throw new NotFoundException('Certificado no encontrado');
    return {
      path: join(
        process.cwd(),
        'uploads',
        'certificates',
        `${certificate.verificationCode}.pdf`,
      ),
      filename: `${certificate.folio}.pdf`,
    };
  }

  private generatePdf(
    path: string,
    value: {
      academy: string;
      student: string;
      course: string;
      instructor: string;
      duration: number;
      folio: string;
      verificationCode: string;
      issuedAt: Date;
    },
  ) {
    return new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 0,
      });
      const stream = createWriteStream(path);
      doc.pipe(stream);
      const width = 841.89;
      const height = 595.28;
      doc.rect(0, 0, width, height).fill('#f5f8fb');
      doc
        .lineWidth(10)
        .strokeColor('#07111f')
        .rect(20, 20, width - 40, height - 40)
        .stroke();
      doc
        .lineWidth(2)
        .strokeColor('#20c9e6')
        .rect(36, 36, width - 72, height - 72)
        .stroke();
      doc
        .fillColor('#07111f')
        .font('Helvetica-Bold')
        .fontSize(18)
        .text('LUIS TOLEDO', 0, 68, { align: 'center' });
      doc
        .fillColor('#079bb9')
        .fontSize(11)
        .text('ACADEMY', 0, 92, { align: 'center' });
      doc
        .fillColor('#172235')
        .font('Helvetica-Bold')
        .fontSize(38)
        .text('CERTIFICADO', 0, 135, { align: 'center' });
      doc
        .fillColor('#697789')
        .font('Helvetica')
        .fontSize(13)
        .text('SE OTORGA A', 0, 195, { align: 'center' });
      doc
        .fillColor('#07111f')
        .font('Helvetica-BoldOblique')
        .fontSize(31)
        .text(value.student, 80, 225, { width: width - 160, align: 'center' });
      doc
        .moveTo(190, 270)
        .lineTo(width - 190, 270)
        .strokeColor('#20c9e6')
        .lineWidth(1)
        .stroke();
      doc
        .fillColor('#526174')
        .font('Helvetica')
        .fontSize(13)
        .text('Por haber completado satisfactoriamente el curso', 0, 298, {
          align: 'center',
        });
      doc
        .fillColor('#07111f')
        .font('Helvetica-Bold')
        .fontSize(24)
        .text(value.course, 80, 328, { width: width - 160, align: 'center' });
      const date = value.issuedAt.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
      doc
        .fillColor('#697789')
        .font('Helvetica')
        .fontSize(10)
        .text(
          `${value.duration || 0} minutos de formación · Emitido el ${date}`,
          0,
          373,
          { align: 'center' },
        );
      doc.moveTo(130, 458).lineTo(330, 458).strokeColor('#718095').stroke();
      doc
        .fillColor('#172235')
        .font('Helvetica-Bold')
        .fontSize(11)
        .text(value.instructor, 130, 465, { width: 200, align: 'center' });
      doc
        .fillColor('#718095')
        .font('Helvetica')
        .fontSize(8)
        .text('Instructor', 130, 482, { width: 200, align: 'center' });
      doc
        .moveTo(width - 330, 458)
        .lineTo(width - 130, 458)
        .stroke();
      doc
        .fillColor('#172235')
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(value.folio, width - 330, 465, { width: 200, align: 'center' });
      doc
        .fillColor('#718095')
        .font('Helvetica')
        .fontSize(8)
        .text(`Verificación: ${value.verificationCode}`, width - 330, 482, {
          width: 200,
          align: 'center',
        });
      doc.end();
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  }
}
