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
 * Written out rather than derived from CreatePurchaseDto, because the optional
 * fields here accept `null` as "clear this", which a PartialType cannot express.
 * @IsOptional() skips null as well as undefined, so the service decides what a
 * null means — see API-PUR-26.
 */
export class UpdatePurchaseDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  productName?: string;

  @IsOptional()
  @IsEnum(Category, { message: 'Choose one of the listed categories' })
  category?: Category;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  seller?: string | null;

  @IsOptional()
  @IsString()
  @Matches(ISO_DATE, DATE_FORMAT)
  purchaseDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Use at most 2 decimal places' })
  @Min(0, { message: 'Must be 0 or more' })
  price?: number;

  @IsOptional()
  @IsISO4217CurrencyCode({ message: 'Use a 3-letter currency code such as INR' })
  currency?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  returnWindowDays?: number | null;

  @IsOptional()
  @IsString()
  @Matches(ISO_DATE, DATE_FORMAT)
  returnDeadline?: string | null;

  @IsOptional()
  @IsString()
  @Matches(ISO_DATE, DATE_FORMAT)
  warrantyStartDate?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  warrantyMonths?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}
