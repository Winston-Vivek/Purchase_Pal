import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../users/user.entity';
import { DashboardResponse } from './dashboard-response';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Counts, what needs action, what just expired, what is new' })
  index(@CurrentUser() user: User): Promise<DashboardResponse> {
    return this.dashboard.summarise(user);
  }
}
