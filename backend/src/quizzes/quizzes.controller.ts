import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { AuthGuard } from '../auth/auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { SaveQuizDto, SubmitQuizDto } from './dto/quiz.dto';
import { QuizzesService } from './quizzes.service';

@Controller()
export class QuizzesController {
  constructor(private readonly quizzes: QuizzesService) {}

  @Get('admin/courses/lessons/:lessonId/quiz')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('courses.manage')
  adminGet(@Param('lessonId') lessonId: string) {
    return this.quizzes.adminGet(lessonId);
  }

  @Put('admin/courses/lessons/:lessonId/quiz')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('courses.manage')
  save(@Param('lessonId') lessonId: string, @Body() dto: SaveQuizDto) {
    return this.quizzes.save(lessonId, dto);
  }

  @Get('learning/lessons/:lessonId/quiz')
  @UseGuards(AuthGuard)
  studentGet(
    @Param('lessonId') lessonId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.quizzes.studentGet(req.auth.sub, lessonId);
  }

  @Post('learning/lessons/:lessonId/quiz/submit')
  @UseGuards(AuthGuard)
  submit(
    @Param('lessonId') lessonId: string,
    @Body() dto: SubmitQuizDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.quizzes.submit(req.auth.sub, lessonId, dto);
  }
}
