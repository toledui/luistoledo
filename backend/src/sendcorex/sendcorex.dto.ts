import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  IsInt,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
export class SendcorexSettingsDto {
  @IsBoolean() enabled!: boolean;
  @IsOptional() @IsString() @MaxLength(4096) apiKey?: string;
  @IsOptional() @IsBoolean() clearApiKey?: boolean;
}
export class SendcorexContactsDto {
  @IsOptional() @IsString() @MaxLength(191) search?: string;
  @IsOptional()
  @IsIn(['NOT_QUEUED', 'PENDING', 'DELIVERED', 'FAILED'])
  status?: string;
  @Type(() => Number) @IsInt() @Min(1) @IsOptional() page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) @IsOptional() pageSize = 25;
}
