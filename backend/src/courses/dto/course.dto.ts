import { CourseLevel, CourseStatus, LessonType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCourseDto {
  @IsString() @MaxLength(191) title!: string;
  @IsOptional() @IsString() @MaxLength(191) slug?: string;
}

export class UpdateCourseDto {
  @IsOptional() @IsString() @MaxLength(191) title?: string;
  @IsOptional() @IsString() @MaxLength(191) slug?: string;
  @IsOptional() @IsString() @MaxLength(255) subtitle?: string;
  @IsOptional() @IsString() shortDescription?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() objectives?: string;
  @IsOptional() @IsString() requirements?: string;
  @IsOptional() @IsEnum(CourseStatus) status?: CourseStatus;
  @IsOptional() @IsEnum(CourseLevel) level?: CourseLevel;
  @IsOptional() @IsString() @MaxLength(12) language?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) price?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) salePrice?:
    number | null;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  estimatedMinutes?: number;
  @IsOptional() @IsBoolean() featured?: boolean;
  @IsOptional() @IsString() categoryId?: string | null;
  @IsOptional() @IsString() coverMediaId?: string | null;
  @IsOptional() @IsString() instructorId?: string | null;
}

export class CreateSectionDto {
  @IsString() @MaxLength(191) title!: string;
  @IsOptional() @IsString() description?: string;
}

export class UpdateSectionDto {
  @IsOptional() @IsString() @MaxLength(191) title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) position?: number;
}

export class CreateLessonDto {
  @IsString() @MaxLength(191) title!: string;
  @IsEnum(LessonType) type!: LessonType;
}

export class UpdateLessonDto {
  @IsOptional() @IsString() @MaxLength(191) title?: string;
  @IsOptional() @IsEnum(LessonType) type?: LessonType;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsString() mediaId?: string | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) durationMinutes?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) position?: number;
  @IsOptional() @IsBoolean() isPreview?: boolean;
  @IsOptional() @IsBoolean() isPublished?: boolean;
}
