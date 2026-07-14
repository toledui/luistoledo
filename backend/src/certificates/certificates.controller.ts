import {
  Controller,
  Get,
  Param,
  Req,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { AuthGuard } from '../auth/auth.guard';
import { createReadStream } from 'node:fs';
import { CertificatesService } from './certificates.service';

@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificates: CertificatesService) {}

  @Get('verify/:code')
  verify(@Param('code') code: string) {
    return this.certificates.verify(code);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  mine(@Req() req: AuthenticatedRequest) {
    return this.certificates.mine(req.auth.sub);
  }

  @Get(':id/download')
  @UseGuards(AuthGuard)
  async download(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const file = await this.certificates.file(req.auth.sub, id);
    return new StreamableFile(createReadStream(file.path), {
      type: 'application/pdf',
      disposition: `attachment; filename="${file.filename}"`,
    });
  }
}
