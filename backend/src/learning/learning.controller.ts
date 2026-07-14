import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { AuthGuard } from '../auth/auth.guard';
import { UpdateProgressDto } from './dto/progress.dto';
import { LearningService } from './learning.service';

@Controller('learning')
@UseGuards(AuthGuard)
export class LearningController {
  constructor(private readonly learning: LearningService) {}

  @Get('courses/:slug')
  course(@Param('slug') slug: string, @Req() req: AuthenticatedRequest) {
    return this.learning.course(req.auth.sub, slug);
  }

  @Put('lessons/:id/progress')
  progress(
    @Param('id') id: string,
    @Body() dto: UpdateProgressDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.learning.touch(req.auth.sub, id, dto);
  }

  @Post('lessons/:id/complete')
  complete(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.learning.touch(req.auth.sub, id, {}, true);
  }
}
