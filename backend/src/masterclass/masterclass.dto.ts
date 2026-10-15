import { Transform, Type } from 'class-transformer';
import {
  Equals,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class RegisterMasterclassDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(191)
  email!: string;
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replace(/[\s()-]/g, '') : value,
  )
  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message:
      'Escribe tu WhatsApp con lada internacional, por ejemplo +525512345678.',
  })
  whatsapp!: string;
  @Equals(true, {
    message:
      'Acepta el aviso de privacidad y el contacto sobre la masterclass.',
  })
  consent!: boolean;
  @IsOptional() @IsString() @MaxLength(2048) turnstileToken?: string;
}

export class ListMasterclassDto {
  @Type(() => Number) @IsInt() @Min(1) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 25;
  @IsOptional() @IsString() @MaxLength(160) search?: string;
}
