import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength } from 'class-validator';

export class ChangeEmailDto {
  @ApiProperty({ example: 'ada.lovelace@example.com' })
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(255)
  email!: string;

  /** BR-15: a stolen session must not be able to walk off with the account. */
  @ApiProperty()
  @IsString()
  @MaxLength(72)
  currentPassword!: string;
}
