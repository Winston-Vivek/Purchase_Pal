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

/** Shape only. Whether the date exists, and the cross-field rules, are checked
 *  in PurchasesService against DatesService — one place for date truth. */
export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_FORMAT = { message: 'Use the date format YYYY-MM-DD' };

export class CreatePurchaseDto {
  @IsString()
  @Length(1, 120)
  productName!: string;

  @IsEnum(Category, { message: 'Choose one of the listed categories' })
  category!: Category;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  seller?: string;

  @IsString()
  @Matches(ISO_DATE, DATE_FORMAT)
  purchaseDate!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Use at most 2 decimal places' })
  @Min(0, { message: 'Must be 0 or more' })
  price!: number;

  @IsOptional()
  @IsISO4217CurrencyCode({ message: 'Use a 3-letter currency code such as INR' })
  currency?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  returnWindowDays?: number;

  @IsOptional()
  @IsString()
  @Matches(ISO_DATE, DATE_FORMAT)
  returnDeadline?: string;

  @IsOptional()
  @IsString()
  @Matches(ISO_DATE, DATE_FORMAT)
  warrantyStartDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  warrantyMonths?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
