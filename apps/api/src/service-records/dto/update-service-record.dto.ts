import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Length, Matches, MaxLength, Min } from 'class-validator';
import { ISO_DATE } from '../../purchases/dto/create-purchase.dto';

const DATE_FORMAT = { message: 'Use the date format YYYY-MM-DD' };

/** Explicit, not PartialType: provider, cost and notes accept null to mean
 *  "clear this", which making the store fields optional does not express. */
export class UpdateServiceRecordDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(ISO_DATE, DATE_FORMAT)
  serviceDate?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  description?: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  provider?: string | null;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Use at most 2 decimal places' })
  @Min(0, { message: 'Must be 0 or more' })
  cost?: number | null;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}
