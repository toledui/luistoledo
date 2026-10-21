import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { BlogPostStatus } from '@prisma/client';

export class BlogBlockDto {
  @IsString() @MinLength(1) @MaxLength(64) id!: string;
  @IsIn([
    'paragraph',
    'heading',
    'image',
    'quote',
    'list',
    'button',
    'video',
    'divider',
  ])
  type!: string;
  @IsOptional() @IsString() @MaxLength(12000) text?: string;
  @IsOptional() @IsIn([2, 3]) level?: number;
  @IsOptional() @IsString() @MaxLength(2000) url?: string;
  @IsOptional() @IsString() @MaxLength(250) alt?: string;
  @IsOptional() @IsString() @MaxLength(500) caption?: string;
  @IsOptional() @IsString() @MaxLength(150) attribution?: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(1000, { each: true })
  items?: string[];
  @IsOptional() @IsBoolean() ordered?: boolean;
}
export class CreateBlogPostDto {
  @IsString() @MinLength(1) @MaxLength(191) title!: string;
}
export class UpdateBlogPostDto {
  @IsString() @MinLength(1) @MaxLength(191) title!: string;
  @IsString() @MinLength(1) @MaxLength(191) slug!: string;
  @IsString() @MaxLength(500) excerpt!: string;
  @IsOptional() @IsString() @MaxLength(2000) coverUrl?: string;
  @IsOptional() @IsString() @MaxLength(250) coverAlt?: string;
  @IsString() @MinLength(1) @MaxLength(150) authorName!: string;
  @IsOptional() @IsString() @MaxLength(64) categoryId?: string;
  @IsEnum(BlogPostStatus) status!: BlogPostStatus;
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => BlogBlockDto)
  blocks!: BlogBlockDto[];
  @IsOptional() @IsString() @MaxLength(191) seoTitle?: string;
  @IsOptional() @IsString() @MaxLength(300) seoDescription?: string;
  @IsOptional() @IsISO8601({ strict: true }) publishedAt?: string | null;
}
export class BlogCategoryDto {
  @IsString() @MinLength(1) @MaxLength(100) name!: string;
  @IsOptional() @IsString() @MaxLength(191) slug?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
}
export class BlogListDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 12;
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsString() @MaxLength(191) category?: string;
  @IsOptional() @IsEnum(BlogPostStatus) status?: BlogPostStatus;
}
