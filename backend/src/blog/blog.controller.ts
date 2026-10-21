import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { BlogService } from './blog.service';
import {
  BlogCategoryDto,
  BlogListDto,
  CreateBlogPostDto,
  UpdateBlogPostDto,
} from './blog.dto';
@Controller('blog')
export class PublicBlogController {
  constructor(private readonly blog: BlogService) {}
  @Get('redirects/:slug') @Header('Cache-Control', 'no-store') redirect(
    @Param('slug') slug: string,
  ) {
    return this.blog.redirect(slug);
  }
  @Get('posts') @Header('Cache-Control', 'no-store') posts(
    @Query() query: BlogListDto,
  ) {
    return this.blog.list(query);
  }
  @Get('categories') @Header('Cache-Control', 'no-store') categories() {
    return this.blog.categories();
  }
  @Get('categories/:slug') @Header('Cache-Control', 'no-store') category(
    @Param('slug') slug: string,
  ) {
    return this.blog.publicCategory(slug);
  }
  @Get('posts/:slug') @Header('Cache-Control', 'no-store') post(
    @Param('slug') slug: string,
  ) {
    return this.blog.publicPost(slug);
  }
  @Get('sitemap') @Header('Cache-Control', 'no-store') sitemap() {
    return this.blog.sitemap();
  }
}
@Controller('admin/blog')
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermissions('blog.manage')
export class AdminBlogController {
  constructor(private readonly blog: BlogService) {}
  @Get('posts') posts(@Query() query: BlogListDto) {
    return this.blog.list(query, true);
  }
  @Get('posts/:id') post(@Param('id') id: string) {
    return this.blog.get(id);
  }
  @Post('posts') create(
    @Body() dto: CreateBlogPostDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.blog.create(dto, req.auth.sub);
  }
  @Patch('posts/:id') update(
    @Param('id') id: string,
    @Body() dto: UpdateBlogPostDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.blog.update(id, dto, req.auth.sub);
  }
  @Delete('posts/:id') remove(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.blog.remove(id, req.auth.sub);
  }
  @Get('categories') categories() {
    return this.blog.categories(true);
  }
  @Post('categories') createCategory(
    @Body() dto: BlogCategoryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.blog.saveCategory(dto, req.auth.sub);
  }
  @Patch('categories/:id') updateCategory(
    @Param('id') id: string,
    @Body() dto: BlogCategoryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.blog.saveCategory(dto, req.auth.sub, id);
  }
  @Delete('categories/:id') removeCategory(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.blog.removeCategory(id, req.auth.sub);
  }
}
