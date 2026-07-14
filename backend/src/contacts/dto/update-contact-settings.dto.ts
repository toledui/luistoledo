import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateContactSettingsDto {
  @IsOptional() @IsEmail() @MaxLength(191) recipientEmail?: string;
  @IsOptional() @IsBoolean() turnstileEnabled?: boolean;
  @IsOptional() @IsString() @MaxLength(255) turnstileSiteKey?: string;
  @IsOptional() @IsString() @MaxLength(255) turnstileSecretKey?: string;
}
