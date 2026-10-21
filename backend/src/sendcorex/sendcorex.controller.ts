import {
  Body,
  Controller,
  Get,
  Header,
  Patch,
  Post,
  Req,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { SendcorexService } from './sendcorex.service';
import { SendcorexSettingsDto, SendcorexContactsDto } from './sendcorex.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { parseContactCsv } from './contact-csv';

@Controller('admin/sendcorex')
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermissions('settings.manage')
export class SendcorexController {
  constructor(private readonly sendcorex: SendcorexService) {}
  @Get('settings') @Header('Cache-Control', 'no-store') settings() {
    return this.sendcorex.settings();
  }
  @Patch('settings') save(
    @Body() dto: SendcorexSettingsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.sendcorex.save(dto, req.auth.sub);
  }
  @Get('status') @Header('Cache-Control', 'no-store') status() {
    return this.sendcorex.status();
  }
  @Post('retry') retry() {
    return this.sendcorex.retry();
  }
  @Get('contacts') @Header('Cache-Control', 'no-store') contacts(
    @Query() query: SendcorexContactsDto,
  ) {
    return this.sendcorex.contacts(query);
  }
  @Post('sync-all') syncAll(@Req() req: AuthenticatedRequest) {
    return this.sendcorex.startSync(req.auth.sub);
  }
  @Post('imports/preview')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024, files: 1 },
    }),
  )
  previewCsv(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Selecciona un archivo CSV');
    const { rows, ...summary } = parseContactCsv(file.buffer);
    return { ...summary, sample: rows.slice(0, 10) };
  }
  @Post('imports')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024, files: 1 },
    }),
  )
  importCsv(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Selecciona un archivo CSV');
    return this.sendcorex.startImport(
      file.buffer,
      file.originalname,
      req.auth.sub,
    );
  }
}
