import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ListMediaDto {
  @IsOptional()
  @IsIn(['IMAGE', 'DOCUMENT', 'VIDEO_EMBED'])
  kind?: 'IMAGE' | 'DOCUMENT' | 'VIDEO_EMBED';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
