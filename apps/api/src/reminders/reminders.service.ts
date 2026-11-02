import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { DashboardService } from '../dashboard/dashboard.service';
import { MAILER, Mailer } from '../common/mail/mail.interface';
import { ReminderLine, deadlineDigest } from '../common/mail/templates';
import { UserRepository } from '../repositories/user/user.repository';
import { SentReminder } from './sent-reminder.entity';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly users: UserRepository,
    private readonly dashboard: DashboardService,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    @Inject(MAILER) private readonly mailer: Mailer,
  ) {}

  /**
   * BR-16. One digest per user, for the deadlines that have reached their own
   * alert windows and have not been sent before.
   *
   * Reuses the dashboard's resolution rather than querying again, so the email
   * and the screen can never disagree about what needs attention — which they
   * would, eventually, if the rules were written twice.
   */
  async sendDue(): Promise<{ users: number; reminders: number }> {
    const base = this.config.getOrThrow<string>('APP_URL');
    let notified = 0;
    let reminders = 0;

    for (const user of await this.users.all()) {
      // Checked before any work: someone who opted out should not even have
      // a row written about them.
      if (!user.emailReminders) continue;

      const summary = await this.dashboard.summarise(user);
      const lines: ReminderLine[] = [];

      for (const item of summary.needsAction) {
        const fresh = await this.claim(user.id, item.purchaseId, item.kind, item.date);
        if (!fresh) continue;

        lines.push({
          productName: item.productName,
          summary: describe(item.kind, item.daysLeft),
          url: `${base}/purchases/${item.purchaseId}`,
        });
      }

      if (lines.length === 0) continue;

      await this.mailer.send(deadlineDigest(user.email, lines));
      notified += 1;
      reminders += lines.length;
    }

    this.logger.log(`Reminders: ${reminders} deadline(s) to ${notified} user(s)`);
    return { users: notified, reminders };
  }

  /**
   * Takes ownership of one reminder, or reports that someone already has.
   *
   * The insert is the check. `ON CONFLICT DO NOTHING` means two runs racing
   * each other cannot both win, which a read-then-write could.
   */
  private async claim(
    userId: string,
    purchaseId: string,
    kind: string,
    deadlineDate: string,
  ): Promise<boolean> {
    const inserted: unknown[] = await this.dataSource.getRepository(SentReminder).query(
      `INSERT INTO sent_reminders (user_id, purchase_id, kind, deadline_date)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, purchase_id, kind, deadline_date) DO NOTHING
         RETURNING id`,
      [userId, purchaseId, kind, deadlineDate],
    );

    return inserted.length > 0;
  }
}

/** The words the badge would use, so an email and the app describe the same
 *  deadline the same way. */
function describe(kind: string, daysLeft: number): string {
  const days = `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}`;

  if (kind === 'RETURN') {
    return daysLeft === 0 ? 'Return closes today' : `Return closes in ${days}`;
  }
  if (kind === 'WARRANTY') {
    return daysLeft === 0 ? 'Warranty ends today' : `Warranty ends in ${days}`;
  }
  return daysLeft === 0 ? 'Service due today' : `Service due in ${days}`;
}
