import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Ranges from requirements §7. Both optional, so a client can change one
 * window without resending the other.
 */
export class UpdateSettingsDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 365, default: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  warrantyAlertDays?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 60, default: 7 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  returnAlertDays?: number;

  /** BR-12. Wider range than a return, because a service can be a year out. */
  @ApiPropertyOptional({ minimum: 1, maximum: 365, default: 14 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  serviceAlertDays?: number;
}
