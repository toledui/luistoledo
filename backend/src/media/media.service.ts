import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MediaKind } from '@prisma/client';
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVideoEmbedDto } from './dto/create-video-embed.dto';
import { ListMediaDto } from './dto/list-media.dto';

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  list(query: ListMediaDto) {
    return this.prisma.mediaAsset.findMany({
      where: {
        ...(query.kind ? { kind: query.kind } : {}),
        ...(query.search ? { name: { contains: query.search } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: { uploadedBy: { select: { firstName: true, lastName: true } } },
      take: 200,
    });
  }

  createFile(file: Express.Multer.File, actorId: string, altText?: string) {
    const kind = file.mimetype.startsWith('image/')
      ? MediaKind.IMAGE
      : MediaKind.DOCUMENT;
    const baseUrl = this.config
      .get<string>('BACKEND_PUBLIC_URL', 'http://localhost:4000')
      .replace(/\/$/, '');
    return this.prisma.mediaAsset.create({
      data: {
        kind,
        name: file.originalname.replace(/\.[^.]+$/, ''),
        originalName: file.originalname,
        url: `${baseUrl}/uploads/media/${file.filename}`,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        altText: altText || null,
        uploadedById: actorId,
      },
    });
  }

  createVideo(dto: CreateVideoEmbedDto, actorId: string) {
    const parsed = new URL(dto.url);
    const hostname = parsed.hostname.toLowerCase();
    const provider = hostname.includes('screenpal')
      ? 'ScreenPal'
      : hostname.includes('adilo')
        ? 'Adilo'
        : hostname.includes('vimeo')
          ? 'Vimeo'
          : hostname.includes('youtube') || hostname.includes('youtu.be')
            ? 'YouTube'
            : 'Externo';
    if (parsed.protocol !== 'https:')
      throw new BadRequestException('El video debe usar una URL HTTPS');
    return this.prisma.mediaAsset.create({
      data: {
        kind: MediaKind.VIDEO_EMBED,
        name: dto.name,
        url: dto.url,
        provider,
        altText: dto.altText || null,
        uploadedById: actorId,
      },
    });
  }

  async remove(id: string) {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('Recurso no encontrado');
    await this.prisma.mediaAsset.delete({ where: { id } });
    if (asset.kind !== MediaKind.VIDEO_EMBED) {
      const filename = asset.url.split('/').pop();
      if (filename)
        await unlink(join(process.cwd(), 'uploads', 'media', filename)).catch(
          () => undefined,
        );
    }
    return { deleted: true };
  }
}
