import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'ada@example.com' })
  @IsEmail({}, { message: 'Enter a valid email address' })
  email!: string;

  // Deliberately no length or pattern rules: telling someone their attempt was
  // "too short to be our password" is a hint we do not need to give.
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password!: string;
}
