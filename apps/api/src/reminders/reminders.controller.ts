import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';
import { CronSecretGuard } from './cron-secret.guard';
import { RemindersService } from './reminders.service';

/**
 * The daily job, as a URL.
 *
 * A host that sleeps when idle cannot run an in-process cron, so the schedule
 * lives outside — Vercel Cron calls this. The in-process @Cron stays for a
 * host that does stay awake; BR-16's unique index means both firing is
 * harmless rather than a double send.
 *
 * Hidden from the published API docs: it is infrastructure, not something a
 * client should ever call.
 */
@ApiExcludeController()
@Controller('internal/reminders')
export class RemindersController {
  constructor(private readonly reminders: RemindersService) {}

  /** @Public() only in the sense that the JWT guard skips it — the cron
   *  secret is what actually stands in the way. */
  @Public()
  @UseGuards(CronSecretGuard)
  @Post('run')
  @HttpCode(200)
  async run(): Promise<{ users: number; reminders: number }> {
    return this.reminders.sendDue();
  }
}
