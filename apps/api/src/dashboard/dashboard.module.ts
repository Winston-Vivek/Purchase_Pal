import { Module } from '@nestjs/common';
import { DatesModule } from '../common/dates/dates.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [DatesModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
