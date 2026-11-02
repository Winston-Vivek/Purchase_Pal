import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { EmailChangeToken } from '../../users/email-change-token.entity';

@Injectable()
export class EmailChangeRepository {
  constructor(
    @InjectRepository(EmailChangeToken)
    private readonly tokens: Repository<EmailChangeToken>,
  ) {}

  store(data: Partial<EmailChangeToken>): Promise<EmailChangeToken> {
    return this.tokens.save(this.tokens.create(data));
  }

  findByHash(tokenHash: string): Promise<EmailChangeToken | null> {
    return this.tokens.findOne({ where: { tokenHash } });
  }

  /** Asking again replaces the pending change rather than adding a second. */
  async retireUnusedFor(userId: string): Promise<void> {
    await this.tokens.delete({ userId, usedAt: IsNull() });
  }

  async markUsed(token: EmailChangeToken, at: Date): Promise<void> {
    await this.tokens.update({ id: token.id }, { usedAt: at });
  }
}
