import { Injectable } from '@nestjs/common';
import type { BrandingSetting, GeneralSetting } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateBrandingSettingsDto } from './dto/update-branding-settings.dto';
import { UpdateGeneralSettingsDto } from './dto/update-general-settings.dto';

type CacheEntry<T> = { value: T; expiresAt: number };

@Injectable()
export class SettingsService {
  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private readonly ttl = 60_000;

  constructor(private readonly prisma: PrismaService) {}

  private async cached<T>(key: string, loader: () => Promise<T>): Promise<T> {
    const current = this.cache.get(key) as CacheEntry<T> | undefined;
    if (current && current.expiresAt > Date.now()) return current.value;
    const value = await loader();
    this.cache.set(key, { value, expiresAt: Date.now() + this.ttl });
    return value;
  }

  private invalidate() {
    this.cache.clear();
  }

  getGeneral(): Promise<GeneralSetting> {
    return this.cached('general', () =>
      this.prisma.generalSetting.upsert({
        where: { id: 1 },
        update: {},
        create: { id: 1 },
      }),
    );
  }

  getBranding(): Promise<BrandingSetting> {
    return this.cached('branding', () =>
      this.prisma.brandingSetting.upsert({
        where: { id: 1 },
        update: {},
        create: { id: 1 },
      }),
    );
  }

  async getPublic() {
    const [general, branding] = await Promise.all([
      this.getGeneral(),
      this.getBranding(),
    ]);
    return {
      general: {
        academyName: general.academyName,
        tagline: general.tagline,
        supportEmail: general.supportEmail,
        phone: general.phone,
        whatsapp: general.whatsapp,
        timezone: general.timezone,
        defaultLocale: general.defaultLocale,
        defaultCurrency: general.defaultCurrency,
        registrationEnabled: general.registrationEnabled,
        checkoutEnabled: general.checkoutEnabled,
        maintenanceEnabled: general.maintenanceEnabled,
        initialSetupCompleted: general.initialSetupCompleted,
      },
      branding,
    };
  }

  async updateGeneral(
    dto: UpdateGeneralSettingsDto,
    ipAddress?: string,
    actor?: { id: string; email: string },
  ) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const value = await tx.generalSetting.update({
        where: { id: 1 },
        data: dto,
      });
      await tx.settingAudit.create({
        data: {
          section: 'general',
          action: 'UPDATE',
          ipAddress,
          actorId: actor?.id,
          actorEmail: actor?.email,
          changes: { ...dto },
        },
      });
      return value;
    });
    this.invalidate();
    return updated;
  }

  async updateBranding(
    dto: UpdateBrandingSettingsDto,
    ipAddress?: string,
    actor?: { id: string; email: string },
  ) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const value = await tx.brandingSetting.update({
        where: { id: 1 },
        data: dto,
      });
      await tx.settingAudit.create({
        data: {
          section: 'branding',
          action: 'UPDATE',
          ipAddress,
          actorId: actor?.id,
          actorEmail: actor?.email,
          changes: { ...dto },
        },
      });
      return value;
    });
    this.invalidate();
    return updated;
  }

  updateBrandingAsset(
    field:
      'primaryLogoUrl' | 'darkLogoUrl' | 'faviconUrl' | 'openGraphImageUrl',
    url: string,
    ipAddress?: string,
    actor?: { id: string; email: string },
  ) {
    return this.updateBranding({ [field]: url }, ipAddress, actor);
  }

  getAudit() {
    return this.prisma.settingAudit.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
