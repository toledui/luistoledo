import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { AuthGuard } from '../auth/auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { CoursesService } from '../courses/courses.service';
import {
  AdminEnrollDto,
  CatalogQueryDto,
  UpdateEnrollmentDto,
} from './dto/enrollment.dto';
import { EnrollmentsService } from './enrollments.service';
@Controller()
export class EnrollmentsController {
  constructor(
    private readonly enrollments: EnrollmentsService,
    private readonly courses: CoursesService,
  ) {}
  @Get('courses') catalog(@Query() query: CatalogQueryDto) {
    return this.enrollments.catalog(query);
  }
  @Get('catalog/categories') categories() {
    return this.enrollments.categories();
  }
  @Post('enrollments/free/:courseId') @UseGuards(AuthGuard) enroll(
    @Param('courseId') courseId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.enrollments.enrollFree(req.auth.sub, courseId);
  }
  @Get('enrollments/me') @UseGuards(AuthGuard) mine(
    @Req() req: AuthenticatedRequest,
  ) {
    return this.enrollments.mine(req.auth.sub);
  }
  @Get('enrollments/course/:slug') @UseGuards(AuthGuard) enrolledCourse(
    @Param('slug') slug: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.courses.enrolledBySlug(slug, req.auth.sub);
  }
  @Get('admin/courses/:courseId/enrollments')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('courses.manage')
  list(@Param('courseId') courseId: string) {
    return this.enrollments.listCourse(courseId);
  }
  @Post('admin/courses/:courseId/enrollments')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('courses.manage')
  adminEnroll(
    @Param('courseId') courseId: string,
    @Body() dto: AdminEnrollDto,
  ) {
    return this.enrollments.adminEnroll(courseId, dto.userId);
  }
  @Patch('admin/enrollments/:id')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('courses.manage')
  update(@Param('id') id: string, @Body() dto: UpdateEnrollmentDto) {
    return this.enrollments.update(id, dto.status);
  }
  @Delete('admin/enrollments/:id')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('courses.manage')
  remove(@Param('id') id: string) {
    return this.enrollments.remove(id);
  }
}
