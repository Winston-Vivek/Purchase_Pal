import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { DatesService } from '../common/dates/dates.service';
import { MAILER, Mailer } from '../common/mail/mail.interface';
import { passwordChanged } from '../common/mail/templates';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class PasswordChangeService {
  private readonly logger = new Logger(PasswordChangeService.name);

  constructor(
    private readonly users: UsersService,
    private readonly config: ConfigService,
    private readonly dates: DatesService,
    @Inject(MAILER) private readonly mailer: Mailer,
  ) {}

  /**
   * BR-13. Returns the user as they now are, so the caller can issue a fresh
   * cookie: the password fingerprint in the old token no longer matches, and
   * without a new one the user would be signed out by their own action.
   */
  async change(user: User, currentPassword: string, newPassword: string): Promise<User> {
    // First, and always: a wrong password must cost the same whether or not
    // the rest of the request would have been valid.
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'That is not your current password',
        // 400 rather than 401 deliberately: a 401 reads as an expired session
        // and would send a signed-in person back to sign in over a typo.
        fields: { currentPassword: 'That is not your current password' },
      });
    }

    const rounds = this.config.getOrThrow<number>('BCRYPT_ROUNDS');
    const passwordHash = await bcrypt.hash(newPassword, rounds);

    // Wall-clock, not the injectable CLOCK: this is a moment, not a business
    // date, and it is read by people rather than by a deadline rule.
    await this.users.setPassword(user.id, passwordHash, new Date());

    // After the change, so a failure to send cannot leave the password
    // unchanged while the owner is told it changed.
    await this.mailer.send(passwordChanged(user.email, this.dates.today()));
    this.logger.log(`Password changed for ${user.id}`);

    const updated = await this.users.findById(user.id);
    if (!updated) throw new BadRequestException('Account not found');
    return updated;
  }
}
