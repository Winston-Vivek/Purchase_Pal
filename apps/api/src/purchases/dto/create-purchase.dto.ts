import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty({ example: 'AirPods Pro (2nd generation)', maxLength: 120 })
  @IsString()
  @Length(1, 120)
  productName!: string;

  @ApiProperty({ enum: Category, example: Category.ELECTRONICS })
  @IsEnum(Category, { message: 'Choose one of the listed categories' })
  category!: Category;

  @ApiPropertyOptional({ example: 'Amazon', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  seller?: string;

  @ApiProperty({ example: '2026-10-27', description: 'YYYY-MM-DD, not in the future' })
  @IsString()
  @Matches(ISO_DATE, DATE_FORMAT)
  purchaseDate!: string;

  @ApiProperty({ example: 24900, minimum: 0, description: 'At most 2 decimal places' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Use at most 2 decimal places' })
  @Min(0, { message: 'Must be 0 or more' })
  price!: number;

  @ApiPropertyOptional({ example: 'INR', default: 'INR', description: 'ISO 4217 code' })
  @IsOptional()
  @IsISO4217CurrencyCode({ message: 'Use a 3-letter currency code such as INR' })
  currency?: string;

  @ApiPropertyOptional({ example: 7, minimum: 0, maximum: 365 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  returnWindowDays?: number;

  @ApiPropertyOptional({ example: '2026-11-03', description: 'Overrides returnWindowDays (BR-02)' })
  @IsOptional()
  @IsString()
  @Matches(ISO_DATE, DATE_FORMAT)
  returnDeadline?: string;

  @ApiPropertyOptional({
    example: '2026-10-27',
    description: 'Required if warrantyMonths is given',
  })
  @IsOptional()
  @IsString()
  @Matches(ISO_DATE, DATE_FORMAT)
  warrantyStartDate?: string;

  @ApiPropertyOptional({ example: 12, minimum: 1, maximum: 120 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  warrantyMonths?: number;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
