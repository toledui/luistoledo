import { Controller, Get, Param, Query } from '@nestjs/common';
import { CoursesService } from './courses.service';

@Controller('courses')
export class PublicCoursesController {
  constructor(private readonly courses: CoursesService) {}
  @Get() list(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('level') level?: string,
    @Query('limit') limit?: string,
  ) {
    return this.courses.publicList({ search, category, level, limit });
  }
  @Get(':slug') get(@Param('slug') slug: string) {
    return this.courses.publicBySlug(slug);
  }
}
