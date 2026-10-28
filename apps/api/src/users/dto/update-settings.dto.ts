import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Ranges from requirements §7. Both optional, so a client can change one
 * window without resending the other.
 */
export class UpdateSettingsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  warrantyAlertDays?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  returnAlertDays?: number;
}
