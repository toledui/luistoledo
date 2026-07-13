import { ApiPropertyOptional } from '@nestjs/swagger';
import { EmailProvider } from '@prisma/client';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateEmailSettingsDto {
  @ApiPropertyOptional({ enum: EmailProvider })
  @IsOptional()
  @IsEnum(EmailProvider)
  provider?: EmailProvider;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(191)
  host?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() encryption?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() tlsEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() sslEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() username?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() password?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  fromName?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() fromEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() replyToEmail?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  adminNotificationEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() saveLogs?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(60000)
  timeoutMs?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  maxRetries?: number;
}
