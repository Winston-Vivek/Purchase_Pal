import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsISO4217CurrencyCode,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Category } from '../purchase.entity';
import { ISO_DATE } from './create-purchase.dto';

const DATE_FORMAT = { message: 'Use the date format YYYY-MM-DD' };

/**
 * Deliberately NOT PartialType(CreatePurchaseDto).
 *
 * The org template says to derive an update DTO from the store DTO — and also
 * says not to, when "update semantics are not actually equivalent to making the
 * store fields optional". They are not equivalent here: these fields accept
 * `null` to mean "clear this", which PartialType cannot express. @IsOptional()
 * skips null as well as undefined, so the service decides what a null means
 * (API-PUR-26).
 */
export class UpdatePurchaseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 120)
  productName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(Category, { message: 'Choose one of the listed categories' })
  category?: Category;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  seller?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(ISO_DATE, DATE_FORMAT)
  purchaseDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Use at most 2 decimal places' })
  @Min(0, { message: 'Must be 0 or more' })
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO4217CurrencyCode({ message: 'Use a 3-letter currency code such as INR' })
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  returnWindowDays?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(ISO_DATE, DATE_FORMAT)
  returnDeadline?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(ISO_DATE, DATE_FORMAT)
  warrantyStartDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  warrantyMonths?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}
