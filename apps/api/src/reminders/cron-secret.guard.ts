import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { timingSafeEqual } from 'node:crypto';

/**
 * The only thing standing between an anonymous caller and emailing every
 * user, so it fails closed in every direction.
 *
 * No secret configured means nobody gets in — the alternative, treating an
 * unset secret as "no check needed", turns a missing environment variable
 * into an open endpoint.
 */
@Injectable()
export class CronSecretGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('CRON_SECRET') ?? '';
    if (expected === '') throw new UnauthorizedException('Not allowed');

    const request = context.switchToHttp().getRequest<Request>();
    const header = request.header('x-cron-secret') ?? '';

    if (!CronSecretGuard.matches(header, expected)) {
      throw new UnauthorizedException('Not allowed');
    }

    return true;
  }

  /**
   * Constant time, so the comparison does not leak the secret one character
   * at a time. `timingSafeEqual` throws on a length mismatch, which is itself
   * a leak — hashing both sides first makes every comparison the same length.
   */
  private static matches(given: string, expected: string): boolean {
    const a = Buffer.from(given);
    const b = Buffer.from(expected);
    if (a.length !== b.length) {
      // Still compare, against a buffer of our own length, so a wrong length
      // costs the same as a wrong value.
      timingSafeEqual(b, b);
      return false;
    }

    return timingSafeEqual(a, b);
  }
}
