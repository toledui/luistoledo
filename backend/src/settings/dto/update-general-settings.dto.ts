import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateGeneralSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  academyName?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  legalName?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(220)
  tagline?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() generalEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() supportEmail?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  whatsapp?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  address?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) city?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(12)
  postalCode?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(['America/Mexico_City'])
  timezone?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(['es-MX']) defaultLocale?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(['MXN']) defaultCurrency?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  registrationEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() checkoutEnabled?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  maintenanceEnabled?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  initialSetupCompleted?: boolean;
}
