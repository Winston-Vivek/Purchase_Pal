import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { DeadlineStatus } from '../../common/dates/dates.service';
import { Category } from '../purchase.entity';

export enum PurchaseSort {
  NEWEST = 'newest',
  PRICE_DESC = 'price_desc',
  PRICE_ASC = 'price_asc',
  DEADLINE_ASC = 'deadline_asc',
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

  @ApiPropertyOptional({ enum: DeadlineStatus })
  @IsOptional()
  @IsEnum(DeadlineStatus)
  returnStatus?: DeadlineStatus;

  @ApiPropertyOptional({ enum: DeadlineStatus })
  @IsOptional()
  @IsEnum(DeadlineStatus)
  warrantyStatus?: DeadlineStatus;

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
