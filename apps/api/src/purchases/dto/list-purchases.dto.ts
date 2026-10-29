import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { DeadlineStatus } from '../../common/dates/dates.service';
import { Category } from '../purchase.entity';

export enum PurchaseSort {
  NEWEST = 'newest',
  PRICE_DESC = 'price_desc',
  PRICE_ASC = 'price_asc',
  DEADLINE_ASC = 'deadline_asc',
}

/** "ACTIVE,EXPIRING_SOON" -> ["ACTIVE", "EXPIRING_SOON"]. An unknown member
 *  survives the split and is then rejected by @IsEnum({ each: true }). */
function splitStatuses(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

export class ListPurchasesDto {
  @ApiPropertyOptional({ description: 'Matches product name, seller and notes, ignoring case' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ enum: Category })
  @IsOptional()
  @IsEnum(Category)
  category?: Category;

  /**
   * One status or several, comma separated. The dashboard needs both: "under
   * warranty" means ACTIVE or EXPIRING_SOON, and a card that says 5 must link
   * to a list that shows 5. A single value still works unchanged.
   */
  @ApiPropertyOptional({ enum: DeadlineStatus, isArray: true, example: 'ACTIVE,EXPIRING_SOON' })
  @IsOptional()
  @Transform(({ value }) => splitStatuses(value))
  @IsEnum(DeadlineStatus, { each: true })
  returnStatus?: DeadlineStatus[];

  @ApiPropertyOptional({ enum: DeadlineStatus, isArray: true, example: 'ACTIVE,EXPIRING_SOON' })
  @IsOptional()
  @Transform(({ value }) => splitStatuses(value))
  @IsEnum(DeadlineStatus, { each: true })
  warrantyStatus?: DeadlineStatus[];

  @ApiPropertyOptional({ enum: PurchaseSort, default: PurchaseSort.NEWEST })
  @IsOptional()
  @IsEnum(PurchaseSort)
  sort: PurchaseSort = PurchaseSort.NEWEST;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  /** Capped at 50 by the API contract (§9), so one request cannot pull a
   *  whole table. */
  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize: number = 20;
}
