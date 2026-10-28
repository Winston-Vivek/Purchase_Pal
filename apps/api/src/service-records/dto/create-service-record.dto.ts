import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Length, Matches, MaxLength, Min } from 'class-validator';
import { ISO_DATE } from '../../purchases/dto/create-purchase.dto';

const DATE_FORMAT = { message: 'Use the date format YYYY-MM-DD' };

export class CreateServiceRecordDto {
  @ApiProperty({
    example: '2026-10-25',
    description: 'On or after the purchase, not in the future',
  })
  @IsString()
  @Matches(ISO_DATE, DATE_FORMAT)
  serviceDate!: string;

  @ApiProperty({ example: 'Replaced the cooling fan', maxLength: 500 })
  @IsString()
  @Length(1, 500)
  description!: string;

  @ApiPropertyOptional({ example: 'Croma Service Centre', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  provider?: string;

  @ApiPropertyOptional({ example: 1450.5, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Use at most 2 decimal places' })
  @Min(0, { message: 'Must be 0 or more' })
  cost?: number;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
