import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
export class RegisterDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(2) @MaxLength(80) firstName!: string;
  @IsString() @MinLength(2) @MaxLength(80) lastName!: string;
  @IsString() @MinLength(10) @MaxLength(128) password!: string;
}
