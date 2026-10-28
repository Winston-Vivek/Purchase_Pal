import { User } from './user.entity';

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  warrantyAlertDays: number;
  returnAlertDays: number;
}

/**
 * The only shape a User leaves the API in (security-sanitize-output).
 * Building it field by field means a column added later — a reset token, a
 * role — cannot reach a client by accident.
 */
export function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    warrantyAlertDays: user.warrantyAlertDays,
    returnAlertDays: user.returnAlertDays,
  };
}
