import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export const API_KEY_SCOPES = [
  'masterclass:read',
  'masterclass:write',
  ...[
    'courses.manage',
    'blog.manage',
    'users.manage',
    'orders.manage',
    'media.manage',
    'settings.manage',
  ].flatMap((permission) => [`${permission}:read`, `${permission}:write`]),
];

export class CreateApiKeyDto {
  @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsIn(API_KEY_SCOPES, { each: true })
  scopes!: string[];
  @IsOptional() @IsISO8601({ strict: true }) expiresAt?: string;
}
