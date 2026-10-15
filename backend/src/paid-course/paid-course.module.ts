import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PaidCourseController } from './paid-course.controller';
import { PaidCourseService } from './paid-course.service';
@Module({
  imports: [AuthModule],
  controllers: [PaidCourseController],
  providers: [PaidCourseService],
  exports: [PaidCourseService],
})
export class PaidCourseModule {}
