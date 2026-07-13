import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Ip,
  Patch,
  Param,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { diskStorage } from 'multer';
import { extname, join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { UpdateBrandingSettingsDto } from './dto/update-branding-settings.dto';
import { UpdateGeneralSettingsDto } from './dto/update-general-settings.dto';
import { SettingsService } from './settings.service';

@ApiTags('admin settings')
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermissions('settings.manage')
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly config: ConfigService,
  ) {}

  @Get('general')
  @ApiOperation({ summary: 'Obtener configuración general' })
  getGeneral() {
    return this.settings.getGeneral();
  }

  @Patch('general')
  @ApiOperation({ summary: 'Actualizar configuración general' })
  updateGeneral(
    @Body() dto: UpdateGeneralSettingsDto,
    @Ip() ipAddress: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.settings.updateGeneral(dto, ipAddress, {
      id: request.auth.sub,
      email: request.auth.email,
    });
  }

  @Get('branding')
  @ApiOperation({ summary: 'Obtener configuración de marca' })
  getBranding() {
    return this.settings.getBranding();
  }

  @Patch('branding')
  @ApiOperation({ summary: 'Actualizar configuración de marca' })
  updateBranding(
    @Body() dto: UpdateBrandingSettingsDto,
    @Ip() ipAddress: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.settings.updateBranding(dto, ipAddress, {
      id: request.auth.sub,
      email: request.auth.email,
    });
  }

  @Post('branding/upload/:field')
  @ApiOperation({ summary: 'Subir y asignar un recurso de marca' })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_request, file, callback) => {
        const allowed = [
          'image/png',
          'image/jpeg',
          'image/webp',
          'image/x-icon',
          'image/vnd.microsoft.icon',
        ];
        callback(
          allowed.includes(file.mimetype)
            ? null
            : new BadRequestException(
                'Formato no permitido. Usa PNG, JPG, WebP o ICO.',
              ),
          allowed.includes(file.mimetype),
        );
      },
      storage: diskStorage({
        destination: (_request, _file, callback) => {
          const destination = join(process.cwd(), 'uploads', 'branding');
          mkdirSync(destination, { recursive: true });
          callback(null, destination);
        },
        filename: (_request, file, callback) => {
          const extension = extname(file.originalname).toLowerCase();
          const safeExtension = extension.replace(/[^.a-z0-9]/g, '');
          callback(null, `${Date.now()}-${randomUUID()}${safeExtension}`);
        },
      }),
    }),
  )
  uploadBrandingAsset(
    @Param('field') field: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Ip() ipAddress: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const allowedFields = [
      'primaryLogoUrl',
      'darkLogoUrl',
      'faviconUrl',
      'openGraphImageUrl',
    ] as const;
    const assetField = allowedFields.find((value) => value === field);
    if (!assetField) throw new BadRequestException('Recurso no permitido');
    if (!file) throw new BadRequestException('Selecciona un archivo');
    const baseUrl = this.config.get<string>(
      'BACKEND_PUBLIC_URL',
      'http://localhost:4000',
    );
    const url = `${baseUrl.replace(/\/$/, '')}/uploads/branding/${file.filename}`;
    return this.settings.updateBrandingAsset(assetField, url, ipAddress, {
      id: request.auth.sub,
      email: request.auth.email,
    });
  }

  @Get('audit')
  @ApiOperation({ summary: 'Últimos cambios de configuración' })
  getAudit() {
    return this.settings.getAudit();
  }
}
