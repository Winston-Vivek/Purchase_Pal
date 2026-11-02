import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Ada Lovelace', maxLength: 80 })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  name?: string;
}
