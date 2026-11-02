import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class ConfirmEmailDto {
  @ApiProperty({ description: 'From the link in the email' })
  @IsString()
  @MaxLength(200)
  token!: string;
}
