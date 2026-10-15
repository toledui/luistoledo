import { Type } from 'class-transformer';
import { OrderStatus } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
export class ListOrdersDto {
  @IsOptional() @IsString() @MaxLength(191) paymentPlanId?: string;
  @Type(() => Number) @IsInt() @Min(1) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 25;
  @IsOptional() @IsEnum(OrderStatus) status?: OrderStatus;
  @IsOptional() @IsString() @MaxLength(191) search?: string;
  @IsOptional() @IsString() @MaxLength(191) userId?: string;
}
