import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { AUTH_COOKIE, IS_PUBLIC } from './auth.constants';
import { passwordFingerprint } from './password-fingerprint';

// Express types `cookies` as `any`. Omitting it before re-declaring keeps the
// token a string all the way to verifyAsync, instead of an `any` nobody checks.
type AuthedRequest = Omit<Request, 'cookies'> & {
  cookies?: Record<string, string>;
  user?: User;
};

/**
 * Registered as APP_GUARD, so every route is closed unless it opts out with
 * @Public() (security-use-guards). Default-closed means a new endpoint is
 * protected the moment it exists, rather than when someone remembers to guard it.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly users: UsersService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const token = request.cookies?.[AUTH_COOKIE];
    if (!token) throw new UnauthorizedException('Sign in to continue');

    let claims: { sub: string; pwd?: string };
    try {
      claims = await this.jwt.verifyAsync<{ sub: string; pwd?: string }>(token);
    } catch {
      // Expired, tampered or signed with another secret — all the same to us.
      throw new UnauthorizedException('Sign in to continue');
    }

    // The token being valid is not enough: the account may have been deleted
    // since it was issued (security-auth-jwt).
    const user = await this.users.findById(claims.sub);
    if (!user) throw new UnauthorizedException('Sign in to continue');

    // BR-13: a password change ends every session issued under the old one.
    // A token with no fingerprint at all is refused rather than trusted —
    // otherwise omitting the claim would be a way around the check.
    const expected = passwordFingerprint(
      user.passwordHash,
      this.config.getOrThrow<string>('JWT_SECRET'),
    );
    if (claims.pwd !== expected) throw new UnauthorizedException('Sign in to continue');

    request.user = user;
    return true;
  }
}
