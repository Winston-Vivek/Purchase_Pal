import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, Matches, MaxLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Ada Lovelace', maxLength: 80 })
  @IsString()
  @Length(1, 80)
  name!: string;

  @ApiProperty({ example: 'ada@example.com' })
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(255)
  email!: string;

  @ApiProperty({ minLength: 8, maxLength: 72, description: 'At least one letter and one number' })
  @IsString()
  @Length(8, 72, { message: 'Password must be 8 to 72 characters' })
  @Matches(/(?=.*[A-Za-z])(?=.*\d)/, {
    message: 'Password must include at least one letter and one number',
  })
  password!: string;
}
