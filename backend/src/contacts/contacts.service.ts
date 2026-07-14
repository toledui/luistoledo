import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../crypto/encryption.service';
import { EmailService } from '../email/email.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactSettingsDto } from './dto/update-contact-settings.dto';

@Injectable()
export class ContactsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly email: EmailService,
  ) {}

  private settings() {
    return this.prisma.contactSetting.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    });
  }

  async publicSettings() {
    const settings = await this.settings();
    return {
      turnstileEnabled: settings.turnstileEnabled,
      turnstileSiteKey: settings.turnstileSiteKey,
    };
  }

  async adminSettings() {
    const settings = await this.settings();
    return {
      recipientEmail: settings.recipientEmail,
      turnstileEnabled: settings.turnstileEnabled,
      turnstileSiteKey: settings.turnstileSiteKey,
      turnstileSecretConfigured: Boolean(settings.turnstileSecretEncrypted),
    };
  }

  async updateSettings(dto: UpdateContactSettingsDto) {
    const { turnstileSecretKey, ...data } = dto;
    return this.prisma.contactSetting
      .upsert({
        where: { id: 1 },
        create: {
          id: 1,
          ...data,
          turnstileSecretEncrypted: turnstileSecretKey
            ? this.encryption.encrypt(turnstileSecretKey)
            : undefined,
        },
        update: {
          ...data,
          ...(turnstileSecretKey
            ? {
                turnstileSecretEncrypted:
                  this.encryption.encrypt(turnstileSecretKey),
              }
            : {}),
        },
      })
      .then(() => this.adminSettings());
  }

  private async verifyTurnstile(token: string | undefined, ipAddress?: string) {
    const settings = await this.settings();
    if (!settings.turnstileEnabled) return;
    if (!settings.turnstileSiteKey || !settings.turnstileSecretEncrypted)
      throw new BadRequestException(
        'Turnstile no está configurado correctamente',
      );
    if (!token)
      throw new BadRequestException('Completa la verificación de seguridad');
    const secret = this.encryption.decrypt(settings.turnstileSecretEncrypted);
    const body = new URLSearchParams({ secret, response: token });
    if (ipAddress) body.set('remoteip', ipAddress);
    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      { method: 'POST', body },
    );
    const result = (await response.json()) as { success: boolean };
    if (!result.success)
      throw new BadRequestException(
        'La verificación de seguridad no fue válida',
      );
  }

  async create(dto: CreateContactDto, ipAddress?: string, userAgent?: string) {
    await this.verifyTurnstile(dto.turnstileToken, ipAddress);
    const request = await this.prisma.contactRequest.create({
      data: {
        name: dto.name,
        email: dto.email.toLowerCase(),
        phone: dto.phone,
        subject: dto.subject,
        message: dto.message,
        ipAddress,
        userAgent,
      },
    });
    const settings = await this.settings();
    const [general, branding] = await Promise.all([
      this.prisma.generalSetting.findUnique({ where: { id: 1 } }),
      this.prisma.brandingSetting.findUnique({ where: { id: 1 } }),
    ]);
    const recipient =
      settings.recipientEmail || general?.generalEmail || general?.supportEmail;
    if (recipient) {
      const safe = (value: string) =>
        value.replace(
          /[&<>"']/g,
          (character) =>
            ({
              '&': '&amp;',
              '<': '&lt;',
              '>': '&gt;',
              '"': '&quot;',
              "'": '&#039;',
            })[character]!,
        );
      const academy = safe(general?.academyName || 'Luis Toledo Academy');
      const primary = branding?.primaryColor || '#52e1ff';
      const dark = branding?.darkBackgroundColor || '#07111f';
      const logo =
        branding?.emailLogoUrl ||
        branding?.darkLogoUrl ||
        branding?.primaryLogoUrl;
      const replyUrl = `mailto:${encodeURIComponent(dto.email)}?subject=${encodeURIComponent(`Re: ${dto.subject}`)}`;
      const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#eef2f6;font-family:Arial,Helvetica,sans-serif;color:#17263b"><div style="display:none;max-height:0;overflow:hidden">${safe(dto.name)} envió una nueva solicitud de contacto.</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:36px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 14px 45px rgba(17,37,65,.12)"><tr><td style="padding:28px 34px;background:${dark};border-bottom:4px solid ${primary}"><table role="presentation" width="100%"><tr><td>${logo ? `<img src="${safe(logo)}" alt="${academy}" width="150" style="display:block;max-width:150px;max-height:52px;width:auto;height:auto;object-fit:contain">` : `<strong style="color:#fff;font-size:18px">${academy}</strong>`}</td><td align="right"><span style="display:inline-block;padding:7px 11px;border-radius:99px;background:rgba(82,225,255,.12);color:${primary};font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase">Nuevo contacto</span></td></tr></table></td></tr><tr><td style="padding:38px 38px 14px"><p style="margin:0 0 9px;color:#718096;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px">Solicitud recibida desde el sitio web</p><h1 style="margin:0;color:#17263b;font-size:30px;line-height:1.2">${safe(dto.subject)}</h1></td></tr><tr><td style="padding:18px 38px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e3e9ef;border-radius:14px;background:#f8fafc"><tr><td style="padding:18px;border-bottom:1px solid #e3e9ef"><span style="display:block;color:#8491a2;font-size:10px;font-weight:800;text-transform:uppercase">Nombre</span><strong style="display:block;margin-top:5px;color:#203249;font-size:15px">${safe(dto.name)}</strong></td><td style="padding:18px;border-bottom:1px solid #e3e9ef"><span style="display:block;color:#8491a2;font-size:10px;font-weight:800;text-transform:uppercase">Correo</span><a href="mailto:${safe(dto.email)}" style="display:block;margin-top:5px;color:#087f99;font-size:14px;font-weight:700;text-decoration:none">${safe(dto.email)}</a></td></tr><tr><td colspan="2" style="padding:18px"><span style="display:block;color:#8491a2;font-size:10px;font-weight:800;text-transform:uppercase">Teléfono</span><span style="display:block;margin-top:5px;color:#203249;font-size:14px">${safe(dto.phone || 'No indicado')}</span></td></tr></table></td></tr><tr><td style="padding:12px 38px 28px"><div style="padding:24px;border-left:4px solid ${primary};border-radius:4px 12px 12px 4px;background:#f5f8fb"><p style="margin:0 0 10px;color:#8491a2;font-size:10px;font-weight:800;text-transform:uppercase">Mensaje</p><p style="margin:0;color:#35465b;font-size:15px;line-height:1.75">${safe(dto.message).replace(/\n/g, '<br>')}</p></div></td></tr><tr><td align="center" style="padding:0 38px 38px"><a href="${safe(replyUrl)}" style="display:inline-block;padding:14px 25px;border-radius:10px;background:${dark};color:#fff;font-size:14px;font-weight:800;text-decoration:none">Responder a ${safe(dto.name)}</a><p style="margin:15px 0 0;color:#8b97a7;font-size:11px">También puedes gestionar esta solicitud desde el panel administrativo.</p></td></tr><tr><td align="center" style="padding:22px 30px;border-top:1px solid #e7ecf1;background:#f8fafc;color:#8a96a6;font-size:11px;line-height:1.6">Notificación automática de <strong style="color:#536176">${academy}</strong></td></tr></table></td></tr></table></body></html>`;
      await this.email
        .sendRendered(
          recipient,
          `Nueva solicitud: ${dto.subject}`,
          html,
          `Nombre: ${dto.name}\nCorreo: ${dto.email}\nTeléfono: ${dto.phone || 'No indicado'}\nAsunto: ${dto.subject}\n\n${dto.message}`,
          'CONTACT_REQUEST',
        )
        .catch(() => undefined);
    }
    return { id: request.id, success: true };
  }

  list() {
    return this.prisma.contactRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 250,
    });
  }
  async markRead(id: string) {
    const found = await this.prisma.contactRequest.findUnique({
      where: { id },
    });
    if (!found) throw new NotFoundException('Solicitud no encontrada');
    return this.prisma.contactRequest.update({
      where: { id },
      data: { status: 'READ', readAt: new Date() },
    });
  }
}
