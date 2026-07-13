import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { extname, join } from 'node:path';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { AuthGuard } from '../auth/auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { CreateVideoEmbedDto } from './dto/create-video-embed.dto';
import { ListMediaDto } from './dto/list-media.dto';
import { MediaService } from './media.service';

const allowedMimeTypes = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

@Controller('admin/media')
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermissions('media.manage')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Get()
  list(@Query() query: ListMediaDto) {
    return this.media.list(query);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 20 * 1024 * 1024 },
      fileFilter: (_request, file, callback) => {
        const accepted = allowedMimeTypes.includes(file.mimetype);
        callback(
          accepted ? null : new BadRequestException('Formato no permitido'),
          accepted,
        );
      },
      storage: diskStorage({
        destination: (_request, _file, callback) => {
          const destination = join(process.cwd(), 'uploads', 'media');
          mkdirSync(destination, { recursive: true });
          callback(null, destination);
        },
        filename: (_request, file, callback) =>
          callback(
            null,
            `${Date.now()}-${randomUUID()}${extname(file.originalname)
              .toLowerCase()
              .replace(/[^.a-z0-9]/g, '')}`,
          ),
      }),
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('altText') altText: string | undefined,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!file) throw new BadRequestException('Selecciona un archivo');
    return this.media.createFile(file, request.auth.sub, altText);
  }

  @Post('video')
  video(
    @Body() dto: CreateVideoEmbedDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.media.createVideo(dto, request.auth.sub);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.media.remove(id);
  }
}
