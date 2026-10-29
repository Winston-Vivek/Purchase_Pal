/** Mirrors the API's response shapes (docs/requirements.md §9). */

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  warrantyAlertDays: number;
  returnAlertDays: number;
}

export type DeadlineStatus = 'NOT_SET' | 'EXPIRED' | 'EXPIRING_SOON' | 'ACTIVE';
