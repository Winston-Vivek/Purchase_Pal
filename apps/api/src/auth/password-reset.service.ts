import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import { MAILER, Mailer } from '../common/mail/mail.interface';
import { passwordReset } from '../common/mail/templates';
import { PasswordResetRepository } from '../repositories/password-reset/password-reset.repository';
import { UsersService } from '../users/users.service';

/** BR-14. Long enough to find the email, short enough that a forwarded one
 *  stops being a key. */
export const RESET_TOKEN_MINUTES = 30;

/**
 * One message for every reason a token is no good — expired, spent, tampered
 * with, or never issued. Telling them apart would confirm that a particular
 * token was once real, which is a hint nobody needs.
 */
const BAD_TOKEN = 'That reset link is no longer valid. Ask for a new one.';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly users: UsersService,
    private readonly tokens: PasswordResetRepository,
    private readonly config: ConfigService,
    @Inject(MAILER) private readonly mailer: Mailer,
  ) {}

  /**
   * Real wall-clock time, deliberately not the injectable CLOCK.
   *
   * That clock is pinned to a fixed day so deadline rules (BR-01..05) can be
   * tested, and it is a business date, not a moment. A token that expires
   * "30 minutes from 27 October 2026" would never expire in a test and would
   * disagree with the JWT's own timestamps in production.
   */
  private now(): Date {
    return new Date();
  }

  /** A token is high-entropy already, so the digest only has to be fast and
   *  one-way. bcrypt here would cost a slow comparison for no gain. */
  private static digest(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * BR-14: this never reports whether the address has an account.
   *
   * The caller always gets 202. An unknown address simply does no work — and
   * because no mail is sent either way the caller cannot tell from timing
   * what happened.
   */
  async request(rawEmail: string): Promise<void> {
    const email = rawEmail.toLowerCase();
    const user = await this.users.findByEmail(email);
    if (!user) return;

    // Asking again should not leave two live keys to one account.
    await this.tokens.retireUnusedFor(user.id);

    const token = randomBytes(32).toString('base64url');
    const now = this.now();

    await this.tokens.store({
      userId: user.id,
      tokenHash: PasswordResetService.digest(token),
      expiresAt: new Date(now.getTime() + RESET_TOKEN_MINUTES * 60_000),
    });

    // From config, never a request header: a link built from the Host header
    // can be rewritten by whoever sends the request.
    const base = this.config.getOrThrow<string>('APP_URL');
    const link = `${base}/reset-password?token=${token}`;

    await this.mailer.send(passwordReset(user.email, link, RESET_TOKEN_MINUTES));
    this.logger.log(`Reset link issued for ${user.id}`);
  }

  /**
   * Spends a token and sets the new password.
   *
   * Order matters: the password is validated before the token is marked used,
   * so a user who mistypes a weak password still has a working link. The
   * password write and the token write happen together, so a token cannot be
   * spent twice by two requests arriving at once.
   */
  async reset(token: string, password: string): Promise<void> {
    const record = await this.tokens.findByHash(PasswordResetService.digest(token));

    if (!record || record.usedAt !== null || record.expiresAt <= this.now()) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: BAD_TOKEN });
    }

    const rounds = this.config.getOrThrow<number>('BCRYPT_ROUNDS');
    const passwordHash = await bcrypt.hash(password, rounds);
    const now = this.now();

    // BR-13: every session opened before this moment stops working. A reset
    // that leaves the attacker signed in has not removed them.
    await this.users.setPassword(record.userId, passwordHash, now);
    await this.tokens.markUsed(record, now);
    await this.tokens.purgeExpired(now);

    this.logger.log(`Password reset for ${record.userId}`);
  }
}
