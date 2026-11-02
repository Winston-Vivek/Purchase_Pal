import { Module } from '@nestjs/common';
import { DashboardModule } from '../dashboard/dashboard.module';
import { CronSecretGuard } from './cron-secret.guard';
import { RemindersController } from './reminders.controller';
import { RemindersScheduler } from './reminders.scheduler';
import { RemindersService } from './reminders.service';

@Module({
  imports: [DashboardModule],
  controllers: [RemindersController],
  providers: [RemindersService, RemindersScheduler, CronSecretGuard],
  exports: [RemindersService],
})
export class RemindersModule {}
