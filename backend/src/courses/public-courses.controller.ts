import { Controller, Get, Param } from '@nestjs/common';
import { CoursesService } from './courses.service';

@Controller('courses')
export class PublicCoursesController {
  constructor(private readonly courses: CoursesService) {}
  @Get(':slug') get(@Param('slug') slug: string) {
    return this.courses.publicBySlug(slug);
  }
}
