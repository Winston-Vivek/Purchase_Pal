import { IsEmail, IsString, Length, Matches, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @Length(1, 80)
  name!: string;

  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(255)
  email!: string;

  @IsString()
  @Length(8, 72, { message: 'Password must be 8 to 72 characters' })
  @Matches(/(?=.*[A-Za-z])(?=.*\d)/, {
    message: 'Password must include at least one letter and one number',
  })
  password!: string;
}
