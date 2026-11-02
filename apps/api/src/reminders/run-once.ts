import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { RemindersService } from './reminders.service';

/**
 * The daily job, on demand.
 *
 * `npm run reminders:send` — for a demo, for a first run after deploying, and
 * for anyone who wants to see what the 08:00 cron will do without waiting
 * until 08:00.
 */
async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });

  try {
    const { users, reminders } = await app.get(RemindersService).sendDue();
    console.log(`Sent ${reminders} deadline(s) to ${users} user(s)`);
  } finally {
    await app.close();
  }
}

void main();
