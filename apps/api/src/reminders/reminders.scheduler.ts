import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RemindersService } from './reminders.service';

/**
 * The clock, kept apart from the work.
 *
 * RemindersService.sendDue() is an ordinary method with no schedule in it, so
 * a test calls it directly and a person can run it by hand. This class exists
 * only to decide when — which is the part you cannot write a fast test for.
 */
@Injectable()
export class RemindersScheduler {
  private readonly logger = new Logger(RemindersScheduler.name);

  constructor(private readonly reminders: RemindersService) {}

  /**
   * 08:00 in the app's own zone (D-10), not the server's. A reminder that
   * arrives at 2am local time has missed the point of being a reminder.
   */
  @Cron('0 8 * * *', { name: 'deadline-reminders', timeZone: 'Asia/Kolkata' })
  async run(): Promise<void> {
    try {
      const { users, reminders } = await this.reminders.sendDue();
      this.logger.log(`Daily run: ${reminders} deadline(s) to ${users} user(s)`);
    } catch (error) {
      // A scheduled job that throws takes the whole scheduler down with it in
      // some runtimes, and tomorrow's run matters more than today's failure.
      this.logger.error(`Daily run failed: ${error instanceof Error ? error.message : 'unknown'}`);
    }
  }
}
