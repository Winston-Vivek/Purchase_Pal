import { Module } from '@nestjs/common';
import { DashboardModule } from '../dashboard/dashboard.module';
import { RemindersScheduler } from './reminders.scheduler';
import { RemindersService } from './reminders.service';

@Module({
  imports: [DashboardModule],
  providers: [RemindersService, RemindersScheduler],
  exports: [RemindersService],
})
export class RemindersModule {}
