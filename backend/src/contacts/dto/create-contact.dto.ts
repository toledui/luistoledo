import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateContactDto {
  @IsString() @MinLength(2) @MaxLength(160) name!: string;
  @IsEmail() @MaxLength(191) email!: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsString() @MinLength(3) @MaxLength(200) subject!: string;
  @IsString() @MinLength(10) @MaxLength(5000) message!: string;
  @IsOptional() @IsString() @MaxLength(2048) turnstileToken?: string;
}
