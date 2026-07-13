import { EnrollmentStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
export class AdminEnrollDto {
  @IsString() userId!: string;
}
export class UpdateEnrollmentDto {
  @IsEnum(EnrollmentStatus) status!: EnrollmentStatus;
}
export class CatalogQueryDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() level?: string;
}
