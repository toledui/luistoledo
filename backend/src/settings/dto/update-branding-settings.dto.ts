import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsHexColor,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateBrandingSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  primaryLogoUrl?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  darkLogoUrl?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  faviconUrl?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  openGraphImageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsHexColor() primaryColor?: string;
  @ApiPropertyOptional() @IsOptional() @IsHexColor() secondaryColor?: string;
  @ApiPropertyOptional() @IsOptional() @IsHexColor() accentColor?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsHexColor()
  darkBackgroundColor?: string;
  @ApiPropertyOptional() @IsOptional() @IsHexColor() lightSurfaceColor?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  headingFont?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  bodyFont?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  footerText?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(40)
  borderRadius?: number;
}
