import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BlogService } from './blog.service';
import { AdminBlogController, PublicBlogController } from './blog.controller';
@Module({
  imports: [AuthModule],
  controllers: [AdminBlogController, PublicBlogController],
  providers: [BlogService],
})
export class BlogModule {}
