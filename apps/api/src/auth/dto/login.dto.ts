import { IsEmail, IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Enter a valid email address' })
  email!: string;

  // Deliberately no length or pattern rules: telling someone their attempt was
  // "too short to be our password" is a hint we do not need to give.
  @IsString()
  @IsNotEmpty()
  password!: string;
}
