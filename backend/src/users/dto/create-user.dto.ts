import { RegisterDto } from '../../auth/dto/register.dto';

// Administrative creation always creates a student, without granting staff roles.
export class CreateUserDto extends RegisterDto {}
