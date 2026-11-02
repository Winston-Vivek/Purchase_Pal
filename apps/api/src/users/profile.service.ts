import { BadRequestException, ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import { MAILER, Mailer } from '../common/mail/mail.interface';
import { confirmEmailChange, emailChangeRequested } from '../common/mail/templates';
import { EmailChangeRepository } from '../repositories/email-change/email-change.repository';
import { User } from './user.entity';
import { UsersService } from './users.service';

/** BR-15 follows BR-14's shape; longer only because the reader has to switch
 *  inbox to find it. */
export const EMAIL_TOKEN_MINUTES = 60;

/** One answer for spent, expired, tampered and never-issued alike. */
const BAD_TOKEN = 'That confirmation link is no longer valid. Ask for a new one.';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    private readonly users: UsersService,
    private readonly tokens: EmailChangeRepository,
    private readonly config: ConfigService,
    @Inject(MAILER) private readonly mailer: Mailer,
  ) {}

  private static digest(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async rename(user: User, name: string): Promise<User> {
    return this.users.rename(user.id, name);
  }

  /**
   * BR-15. Asks for a change; does not make one.
   *
   * Nothing is written to the user until the link is opened, so a typo or a
   * borrowed session cannot move an account to an inbox its owner does not
   * read.
   */
  async requestEmailChange(user: User, rawEmail: string, currentPassword: string): Promise<void> {
    // The current password, for the same reason a password change needs it: a
    // stolen session must not be able to walk off with the account.
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'That is not your current password',
        fields: { currentPassword: 'That is not your current password' },
      });
    }

    const email = rawEmail.toLowerCase();
    if (email === user.email) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'That is already your email address',
        fields: { email: 'That is already your email address' },
      });
    }

    // Checked here rather than at confirmation time so the user is told now,
    // while they can still do something about it. It is re-checked on
    // confirmation anyway, because the address can be taken in between.
    if (await this.users.findByEmail(email)) {
      throw new ConflictException('That email address is already registered');
    }

    await this.tokens.retireUnusedFor(user.id);

    const token = randomBytes(32).toString('base64url');
    const now = new Date();

    await this.tokens.store({
      userId: user.id,
      newEmail: email,
      tokenHash: ProfileService.digest(token),
      expiresAt: new Date(now.getTime() + EMAIL_TOKEN_MINUTES * 60_000),
    });

    const base = this.config.getOrThrow<string>('APP_URL');
    await this.mailer.send(
      confirmEmailChange(email, `${base}/confirm-email?token=${token}`, EMAIL_TOKEN_MINUTES),
    );
    // The address losing the account is told, without a link: there is
    // nothing for this reader to confirm, and a link here is what a phisher
    // would want.
    await this.mailer.send(emailChangeRequested(user.email, email));

    this.logger.log(`Email change requested for ${user.id}`);
  }

  /** Public on purpose: the token is the authority, and the reader may be
   *  opening the link in a browser that was never signed in. */
  async confirmEmailChange(token: string): Promise<void> {
    const record = await this.tokens.findByHash(ProfileService.digest(token));

    if (!record || record.usedAt !== null || record.expiresAt <= new Date()) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: BAD_TOKEN });
    }

    // Re-checked: the address may have been registered by someone else
    // between the request and the click.
    const taken = await this.users.findByEmail(record.newEmail);
    if (taken && taken.id !== record.userId) {
      throw new ConflictException('That email address is already registered');
    }

    await this.users.changeEmail(record.userId, record.newEmail);
    await this.tokens.markUsed(record, new Date());

    this.logger.log(`Email changed for ${record.userId}`);
  }
}
