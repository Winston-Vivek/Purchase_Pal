import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Repository } from 'typeorm';
import { PasswordResetToken } from '../../auth/password-reset-token.entity';

/** Owns persistence for reset tokens. Lookups are by digest only — the raw
 *  token never reaches this class. */
@Injectable()
export class PasswordResetRepository {
  constructor(
    @InjectRepository(PasswordResetToken)
    private readonly tokens: Repository<PasswordResetToken>,
  ) {}

  store(data: Partial<PasswordResetToken>): Promise<PasswordResetToken> {
    return this.tokens.save(this.tokens.create(data));
  }

  findByHash(tokenHash: string): Promise<PasswordResetToken | null> {
    return this.tokens.findOne({ where: { tokenHash }, relations: { user: true } });
  }

  /** BR-14: asking for a new link retires any unused one, so a request never
   *  leaves two live keys to the same account. */
  async retireUnusedFor(userId: string): Promise<void> {
    await this.tokens.delete({ userId, usedAt: IsNull() });
  }

  async markUsed(token: PasswordResetToken, at: Date): Promise<void> {
    await this.tokens.update({ id: token.id }, { usedAt: at });
  }

  /** Housekeeping: spent and expired rows have no further use. */
  async purgeExpired(before: Date): Promise<void> {
    await this.tokens.delete({ expiresAt: LessThan(before) });
  }
}
