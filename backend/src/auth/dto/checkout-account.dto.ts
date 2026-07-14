import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
export class CheckoutAccountDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(2) @MaxLength(80) firstName!: string;
  @IsString() @MinLength(2) @MaxLength(80) lastName!: string;
}
