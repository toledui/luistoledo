import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import sanitizeHtml from 'sanitize-html';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { DEFAULT_EMAIL_TEMPLATES_BY_EVENT } from './default-email-templates';

const allowedVariables = [
  'student_name',
  'student_email',
  'course_name',
  'course_url',
  'order_number',
  'order_total',
  'payment_method',
  'certificate_url',
  'verification_url',
  'reset_password_url',
  'academy_name',
  'support_email',
  'current_year',
] as const;
@Injectable()
export class EmailTemplateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}
  list() {
    return this.prisma.emailTemplate.findMany({ orderBy: { name: 'asc' } });
  }
  async get(id: string) {
    const value = await this.prisma.emailTemplate.findUnique({ where: { id } });
    if (!value) throw new NotFoundException('Plantilla no encontrada');
    return value;
  }
  private variables(...contents: string[]) {
    return [
      ...new Set(
        contents.flatMap((content) =>
          [...content.matchAll(/{{\s*([a-zA-Z0-9_]+)\s*}}/g)].map(
            (match) => match[1],
          ),
        ),
      ),
    ];
  }
  private validateVariables(contents: string[]) {
    const invalid = this.variables(...contents).filter(
      (variable) =>
        !allowedVariables.includes(
          variable as (typeof allowedVariables)[number],
        ),
    );
    if (invalid.length)
      throw new BadRequestException(
        `Variables no permitidas: ${invalid.join(', ')}`,
      );
  }
  private clean(html: string) {
    return sanitizeHtml(html, {
      allowedTags: [
        'h1',
        'h2',
        'h3',
        'p',
        'a',
        'strong',
        'em',
        'ul',
        'ol',
        'li',
        'br',
        'div',
        'span',
        'table',
        'thead',
        'tbody',
        'tr',
        'th',
        'td',
      ],
      allowedAttributes: {
        '*': ['style'],
        a: ['href', 'target'],
      },
      allowedSchemes: ['http', 'https', 'mailto'],
    });
  }
  async update(
    id: string,
    dto: UpdateTemplateDto,
    actor?: { id: string; email: string },
  ) {
    const current = await this.get(id);
    const html = dto.htmlContent
      ? this.clean(dto.htmlContent)
      : current.htmlContent;
    const text = dto.textContent ?? current.textContent;
    const subject = dto.subject ?? current.subject;
    this.validateVariables([html, text, subject]);
    const updated = await this.prisma.emailTemplate.update({
      where: { id },
      data: { ...dto, htmlContent: html, textContent: text, subject },
    });
    await this.prisma.settingAudit.create({
      data: {
        section: 'email-template',
        action: 'UPDATE',
        actorId: actor?.id,
        actorEmail: actor?.email,
        changes: { templateId: id, event: current.event },
      },
    });
    return updated;
  }
  private context() {
    return {
      student_name: 'Alumno de prueba',
      student_email: 'alumno@example.com',
      course_name: 'Curso de prueba',
      course_url: 'http://localhost:3000/cursos/curso',
      order_number: 'LT-0001',
      order_total: '$1,000 MXN',
      payment_method: 'Prueba',
      certificate_url: 'http://localhost:3000/certificados/demo',
      verification_url: 'http://localhost:3000/verificar-email?token=demo',
      reset_password_url:
        'http://localhost:3000/restablecer-contrasena?token=demo',
      academy_name: 'Luis Toledo Academy',
      support_email: 'contacto@luistoledo.com.mx',
      current_year: String(new Date().getFullYear()),
    };
  }
  private renderText(content: string, context: Record<string, string>) {
    return content.replace(
      /{{\s*([a-zA-Z0-9_]+)\s*}}/g,
      (_, key: string) => context[key] ?? '',
    );
  }
  async preview(id: string) {
    const template = await this.get(id);
    const context = this.context();
    return {
      subject: this.renderText(template.subject, context),
      preheader: template.preheader
        ? this.renderText(template.preheader, context)
        : null,
      html: this.renderText(template.htmlContent, context),
      text: this.renderText(template.textContent, context),
      variables: this.variables(
        template.subject,
        template.htmlContent,
        template.textContent,
      ),
    };
  }
  async sendTest(id: string, recipient: string) {
    const template = await this.get(id);
    const rendered = await this.preview(id);
    return this.email.sendRendered(
      recipient,
      rendered.subject,
      rendered.html,
      rendered.text,
      `TEMPLATE_TEST:${template.event}`,
    );
  }

  async sendEvent(
    event: string,
    recipient: string,
    values: Record<string, string>,
    attachments?: { filename: string; path: string; contentType?: string }[],
  ) {
    const template = await this.prisma.emailTemplate.findUnique({
      where: { event_locale: { event, locale: 'es-MX' } },
    });
    if (!template?.enabled) return { queued: false };
    const context = { ...this.context(), ...values };
    return this.email.sendRendered(
      recipient,
      this.renderText(template.subject, context),
      this.renderText(template.htmlContent, context),
      this.renderText(template.textContent, context),
      event,
      attachments,
    );
  }
  async reset(id: string) {
    const template = await this.get(id);
    const value = DEFAULT_EMAIL_TEMPLATES_BY_EVENT[template.event];
    if (!value)
      throw new BadRequestException(
        'No existe una plantilla predeterminada para este evento',
      );
    return this.prisma.emailTemplate.update({ where: { id }, data: value });
  }
  async duplicate(id: string) {
    const template = await this.get(id);
    const suffix = Date.now();
    return this.prisma.emailTemplate.create({
      data: {
        name: `${template.name} (copia)`,
        event: `${template.event}_COPY_${suffix}`,
        subject: template.subject,
        preheader: template.preheader,
        htmlContent: template.htmlContent,
        textContent: template.textContent,
        locale: template.locale,
        enabled: false,
      },
    });
  }
  allowedVariables() {
    return allowedVariables;
  }
}
