import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches, MaxLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'From the link in the email' })
  @IsString()
  @MaxLength(200)
  token!: string;

  /** The same rule as registration: one place to change it, and a password
   *  set by reset is not allowed to be weaker than one set at sign-up. */
  @ApiProperty({ minLength: 8, maxLength: 72, description: 'At least one letter and one number' })
  @IsString()
  @Length(8, 72, { message: 'Password must be 8 to 72 characters' })
  @Matches(/(?=.*[A-Za-z])(?=.*\d)/, {
    message: 'Password must include at least one letter and one number',
  })
  password!: string;
}
