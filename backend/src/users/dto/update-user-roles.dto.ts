import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsIn } from 'class-validator';
export class UpdateUserRolesDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(3)
  @IsIn(['SUPER_ADMIN', 'ADMIN', 'STUDENT'], { each: true })
  roles!: string[];
}
