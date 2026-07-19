import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { AuthGuard } from '../auth/auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { CoursesService } from './courses.service';
import {
  CreateCourseDto,
  CreateLessonDto,
  CreateLessonResourceDto,
  CreateSectionDto,
  ReorderLessonsDto,
  UpdateCourseDto,
  UpdateLessonDto,
  UpdateSectionDto,
} from './dto/course.dto';

@Controller('admin/courses')
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermissions('courses.manage')
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}
  @Get() list() {
    return this.courses.list();
  }
  @Get('metadata') metadata() {
    return this.courses.metadata();
  }
  @Get('preview/:slug') preview(@Param('slug') slug: string) {
    return this.courses.previewBySlug(slug);
  }
  @Get(':id') get(@Param('id') id: string) {
    return this.courses.get(id);
  }
  @Post() create(
    @Body() dto: CreateCourseDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.courses.create(dto, req.auth.sub);
  }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateCourseDto) {
    return this.courses.update(id, dto);
  }
  @Post(':id/duplicate') duplicate(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.courses.duplicate(id, req.auth.sub);
  }
  @Delete(':id') remove(@Param('id') id: string) {
    return this.courses.remove(id);
  }
  @Post(':id/sections') section(
    @Param('id') id: string,
    @Body() dto: CreateSectionDto,
  ) {
    return this.courses.createSection(id, dto);
  }
  @Patch('sections/:id') updateSection(
    @Param('id') id: string,
    @Body() dto: UpdateSectionDto,
  ) {
    return this.courses.updateSection(id, dto);
  }
  @Delete('sections/:id') removeSection(@Param('id') id: string) {
    return this.courses.removeSection(id);
  }
  @Post('sections/:id/lessons') lesson(
    @Param('id') id: string,
    @Body() dto: CreateLessonDto,
  ) {
    return this.courses.createLesson(id, dto);
  }
  @Patch('sections/:id/lessons/reorder') reorderLessons(
    @Param('id') id: string,
    @Body() dto: ReorderLessonsDto,
  ) {
    return this.courses.reorderLessons(id, dto);
  }
  @Patch('lessons/:id') updateLesson(
    @Param('id') id: string,
    @Body() dto: UpdateLessonDto,
  ) {
    return this.courses.updateLesson(id, dto);
  }
  @Post('lessons/:id/resources') createLessonResource(
    @Param('id') id: string,
    @Body() dto: CreateLessonResourceDto,
  ) {
    return this.courses.createLessonResource(id, dto);
  }
  @Delete('lessons/resources/:id') removeLessonResource(
    @Param('id') id: string,
  ) {
    return this.courses.removeLessonResource(id);
  }
  @Delete('lessons/:id') removeLesson(@Param('id') id: string) {
    return this.courses.removeLesson(id);
  }
}
