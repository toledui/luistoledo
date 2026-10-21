import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BlogPostStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  BlogCategoryDto,
  BlogListDto,
  CreateBlogPostDto,
  UpdateBlogPostDto,
} from './blog.dto';
import { blogSlug, blogUrl, cleanBlogBlocks } from './blog.helpers';
const categorySelect = { id: true, name: true, slug: true } as const;
const cardSelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  coverUrl: true,
  coverAlt: true,
  authorName: true,
  publishedAt: true,
  updatedAt: true,
  category: { select: categorySelect },
} satisfies Prisma.BlogPostSelect;
@Injectable()
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}
  published(): Prisma.BlogPostWhereInput {
    return {
      status: BlogPostStatus.PUBLISHED,
      publishedAt: { lte: new Date() },
    };
  }
  private async write<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002')
          throw new ConflictException(
            'Ese slug ya está en uso. Elige otra URL.',
          );
        if (error.code === 'P2003')
          throw new ConflictException(
            'La categoría está en uso o ya no existe. Reasigna las publicaciones antes de eliminarla.',
          );
        if (error.code === 'P2025')
          throw new NotFoundException('Publicación o categoría no encontrada');
      }
      throw error;
    }
  }
  async list(query: BlogListDto, admin = false) {
    const where: Prisma.BlogPostWhereInput = {
      ...(admin
        ? query.status
          ? { status: query.status }
          : {}
        : this.published()),
      ...(query.category ? { category: { slug: query.category } } : {}),
      ...(query.search?.trim()
        ? {
            OR: [
              { title: { contains: query.search.trim() } },
              { excerpt: { contains: query.search.trim() } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.blogPost.findMany({
        where,
        select: { ...cardSelect, ...(admin ? { status: true } : {}) },
        orderBy: admin
          ? [{ updatedAt: 'desc' }, { id: 'desc' }]
          : [{ publishedAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.blogPost.count({ where }),
    ]);
    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
      pages: Math.ceil(total / query.limit),
    };
  }
  async publicPost(slug: string) {
    const post = await this.prisma.blogPost.findFirst({
      where: { ...this.published(), slug },
      select: {
        ...cardSelect,
        blocks: true,
        seoTitle: true,
        seoDescription: true,
        createdAt: true,
      },
    });
    if (post) return post;
    const previous = await this.prisma.blogPostSlug.findUnique({
      where: { slug },
      select: {
        post: { select: { slug: true, status: true, publishedAt: true } },
      },
    });
    if (
      previous?.post.status === BlogPostStatus.PUBLISHED &&
      previous.post.publishedAt &&
      previous.post.publishedAt <= new Date()
    )
      return { redirectTo: `/blog/${previous.post.slug}` };
    throw new NotFoundException('Publicación no encontrada');
  }
  async get(id: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { id },
      include: { category: { select: categorySelect } },
    });
    if (!post) throw new NotFoundException('Publicación no encontrada');
    return post;
  }
  async redirect(slug: string) {
    const alias = await this.prisma.blogPostSlug.findFirst({
      where: { slug, post: this.published() },
      select: { post: { select: { slug: true } } },
    });
    return { redirectTo: alias ? `/blog/${alias.post.slug}` : null };
  }
  async categories(admin = false) {
    return this.prisma.blogCategory.findMany({
      where: admin ? {} : { posts: { some: this.published() } },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { posts: admin ? true : { where: this.published() } },
        },
      },
    });
  }
  async publicCategory(slug: string) {
    const category = await this.prisma.blogCategory.findFirst({
      where: { slug, posts: { some: this.published() } },
      select: { ...categorySelect, description: true },
    });
    if (!category) throw new NotFoundException('Categoría no encontrada');
    return category;
  }
  async create(dto: CreateBlogPostDto, actorId: string) {
    const title = dto.title.trim();
    if (!title) throw new BadRequestException('Escribe un título');
    const base = blogSlug(title);
    let slug = base;
    let counter = 2;
    while (
      (await this.prisma.blogPost.findUnique({
        where: { slug },
        select: { id: true },
      })) ||
      (await this.prisma.blogPostSlug.findUnique({
        where: { slug },
        select: { slug: true },
      }))
    )
      slug = `${base}-${counter++}`;
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: actorId },
      select: { firstName: true, lastName: true },
    });
    return this.write(() =>
      this.prisma.$transaction(async (tx) => {
        const post = await tx.blogPost.create({
          data: {
            title,
            slug,
            authorName: `${user.firstName} ${user.lastName}`
              .trim()
              .slice(0, 150),
            createdById: actorId,
            blocks: [],
          },
        });
        await tx.settingAudit.create({
          data: {
            section: 'blog',
            action: 'CREATE_POST',
            actorId,
            changes: { postId: post.id },
          },
        });
        return post;
      }),
    );
  }
  async update(id: string, dto: UpdateBlogPostDto, actorId: string) {
    const title = dto.title.trim();
    const authorName = dto.authorName.trim();
    if (!title || !authorName)
      throw new BadRequestException('Título y autor son obligatorios');
    const slug = blogSlug(dto.slug);
    const publishing = dto.status === BlogPostStatus.PUBLISHED;
    const blocks = cleanBlogBlocks(dto.blocks, publishing);
    if (publishing && !dto.excerpt.trim())
      throw new BadRequestException('Escribe el resumen antes de publicar');
    const coverUrl = dto.coverUrl?.trim() ? blogUrl(dto.coverUrl) : null;
    if (publishing && coverUrl && !dto.coverAlt?.trim())
      throw new BadRequestException(
        'Describe la imagen de portada para accesibilidad',
      );
    return this.write(() =>
      this.prisma.$transaction(async (tx) => {
        const current = await tx.blogPost.findUnique({ where: { id } });
        if (!current) throw new NotFoundException('Publicación no encontrada');
        const [other, alias] = await Promise.all([
          tx.blogPost.findUnique({ where: { slug }, select: { id: true } }),
          tx.blogPostSlug.findUnique({ where: { slug } }),
        ]);
        if ((other && other.id !== id) || (alias && alias.postId !== id))
          throw new ConflictException('Ese slug ya está en uso');
        if (
          dto.categoryId &&
          !(await tx.blogCategory.findUnique({
            where: { id: dto.categoryId },
            select: { id: true },
          }))
        )
          throw new BadRequestException('Categoría no encontrada');
        if (slug !== current.slug) {
          if (alias?.postId === id)
            await tx.blogPostSlug.delete({ where: { slug } });
          if (current.publishedAt)
            await tx.blogPostSlug.upsert({
              where: { slug: current.slug },
              update: {},
              create: { slug: current.slug, postId: id },
            });
        }
        const post = await tx.blogPost.update({
          where: { id },
          data: {
            title,
            slug,
            authorName,
            excerpt: dto.excerpt.trim(),
            coverUrl,
            coverAlt: dto.coverAlt?.trim() || null,
            categoryId: dto.categoryId || null,
            status: dto.status,
            blocks,
            seoTitle: dto.seoTitle?.trim() || null,
            seoDescription: dto.seoDescription?.trim() || null,
            publishedAt:
              dto.publishedAt === null
                ? publishing
                  ? new Date()
                  : null
                : dto.publishedAt
                  ? new Date(dto.publishedAt)
                  : current.publishedAt || (publishing ? new Date() : null),
          },
          include: { category: { select: categorySelect } },
        });
        await tx.settingAudit.create({
          data: {
            section: 'blog',
            action: 'UPDATE_POST',
            actorId,
            changes: { postId: id, status: dto.status, slug },
          },
        });
        return post;
      }),
    );
  }
  async remove(id: string, actorId: string) {
    return this.write(() =>
      this.prisma.$transaction(async (tx) => {
        await tx.blogPost.delete({ where: { id } });
        await tx.settingAudit.create({
          data: {
            section: 'blog',
            action: 'DELETE_POST',
            actorId,
            changes: { postId: id },
          },
        });
        return { deleted: true };
      }),
    );
  }
  async saveCategory(dto: BlogCategoryDto, actorId: string, id?: string) {
    const name = dto.name.trim();
    if (!name)
      throw new BadRequestException('Escribe el nombre de la categoría');
    const data = {
      name,
      slug: blogSlug(dto.slug || name),
      description: dto.description?.trim() || null,
    };
    return this.write(() =>
      this.prisma.$transaction(async (tx) => {
        const category = id
          ? await tx.blogCategory.update({ where: { id }, data })
          : await tx.blogCategory.create({ data });
        await tx.settingAudit.create({
          data: {
            section: 'blog',
            action: id ? 'UPDATE_CATEGORY' : 'CREATE_CATEGORY',
            actorId,
            changes: { categoryId: category.id },
          },
        });
        return category;
      }),
    );
  }
  async removeCategory(id: string, actorId: string) {
    return this.write(() =>
      this.prisma.$transaction(async (tx) => {
        if (await tx.blogPost.count({ where: { categoryId: id } }))
          throw new ConflictException(
            'Reasigna las publicaciones de esta categoría antes de eliminarla',
          );
        await tx.blogCategory.delete({ where: { id } });
        await tx.settingAudit.create({
          data: {
            section: 'blog',
            action: 'DELETE_CATEGORY',
            actorId,
            changes: { categoryId: id },
          },
        });
        return { deleted: true };
      }),
    );
  }
  async sitemap() {
    const [posts, categories, courses] = await this.prisma.$transaction([
      this.prisma.blogPost.findMany({
        where: this.published(),
        select: { slug: true, updatedAt: true },
        orderBy: { id: 'asc' },
      }),
      this.prisma.blogCategory.findMany({
        where: { posts: { some: this.published() } },
        select: {
          slug: true,
          updatedAt: true,
          posts: {
            where: this.published(),
            orderBy: { updatedAt: 'desc' },
            take: 1,
            select: { updatedAt: true },
          },
        },
      }),
      this.prisma.course.findMany({
        where: { status: 'PUBLISHED', isListed: true },
        select: { slug: true, updatedAt: true },
      }),
    ]);
    return [
      ...posts.map((post) => ({
        path: `/blog/${post.slug}`,
        updatedAt: post.updatedAt,
      })),
      ...categories.map((category) => ({
        path: `/blog/categoria/${category.slug}`,
        updatedAt:
          category.posts[0]?.updatedAt &&
          category.posts[0].updatedAt > category.updatedAt
            ? category.posts[0].updatedAt
            : category.updatedAt,
      })),
      ...courses.map((course) => ({
        path: `/cursos/${course.slug}`,
        updatedAt: course.updatedAt,
      })),
    ];
  }
}
