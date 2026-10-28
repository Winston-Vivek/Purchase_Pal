import { User } from './user.entity';

export interface SettingsResponse {
  warrantyAlertDays: number;
  returnAlertDays: number;
}

export function toSettingsResponse(user: User): SettingsResponse {
  return {
    warrantyAlertDays: user.warrantyAlertDays,
    returnAlertDays: user.returnAlertDays,
  };
}
