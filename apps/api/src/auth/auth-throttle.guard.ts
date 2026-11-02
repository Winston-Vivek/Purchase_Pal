import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * The ceiling on the authentication endpoints.
 *
 * Applied to those routes only, rather than globally: an ordinary session
 * reading its own purchases must not be refused because someone else on the
 * same network is guessing passwords. The endpoints that need it are the ones
 * an anonymous caller can reach and make the server do work — login, register,
 * reset-password, and above all forgot-password, which sends mail to an
 * address the caller picks.
 */
@Injectable()
export class AuthThrottleGuard extends ThrottlerGuard {}
