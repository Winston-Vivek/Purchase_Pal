import { ConfigService } from '@nestjs/config';
import { CookieOptions } from 'express';

/** "7d" / "15m" -> milliseconds, so the cookie outlives the tab but not the token. */
function toMilliseconds(expiresIn: string): number {
  const match = /^(\d+)([smhdw])$/.exec(expiresIn);
  if (!match) throw new Error(`JWT_EXPIRES_IN "${expiresIn}" is not a duration like 7d`);

  const unit = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 };
  return Number(match[1]) * unit[match[2] as keyof typeof unit];
}

/**
 * One definition, because two controllers set this cookie now: sign-in and a
 * password change, which has to re-issue it (BR-13). Two copies would drift,
 * and the half that forgot `httpOnly` would be the security hole.
 */
export function authCookieOptions(config: ConfigService): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: config.getOrThrow<string>('NODE_ENV') === 'production',
    maxAge: toMilliseconds(config.getOrThrow<string>('JWT_EXPIRES_IN')),
  };
}
