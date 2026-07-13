import { IsEmail } from 'class-validator';
export class TemplateTestDto {
  @IsEmail() recipient!: string;
}
