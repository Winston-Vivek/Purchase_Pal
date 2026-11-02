import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, MaxLength } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'ada@example.com' })
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(255)
  email!: string;
}
