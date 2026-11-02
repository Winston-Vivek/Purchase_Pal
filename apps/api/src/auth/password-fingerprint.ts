import { createHmac } from 'node:crypto';

/**
 * BR-13. A short, verifiable stamp of the password a token was issued under.
 *
 * Carried in the JWT and compared on every request, so changing a password
 * invalidates every token issued under the old one — instantly and exactly.
 *
 * This replaced comparing the token's `iat` against a password_changed_at
 * timestamp. `iat` has one-second resolution, so a token issued in the same
 * second as the change is ambiguous: strict comparison lets an old session
 * survive, and loose comparison kills the new one. A fingerprint has no
 * clock in it and therefore no window at all.
 *
 * HMAC rather than a plain hash so the value cannot be derived from a stolen
 * password hash alone, and truncated because 96 bits is ample for an equality
 * check against a value we computed ourselves.
 */
export function passwordFingerprint(passwordHash: string, secret: string): string {
  return createHmac('sha256', secret).update(passwordHash).digest('base64url').slice(0, 16);
}
