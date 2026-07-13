import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateVideoEmbedDto {
  @IsString()
  @MaxLength(191)
  name!: string;

  @IsUrl({ protocols: ['https'], require_protocol: true })
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  altText?: string;
}
