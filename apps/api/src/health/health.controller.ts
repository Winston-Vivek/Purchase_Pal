import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';
import { HealthRepository } from '../repositories/health/health.repository';

/**
 * Not in the API contract (§9) — operational, not a product feature. Docker,
 * CI and the Day 7 fresh-clone check all need one cheap call that proves the
 * app booted and reached the database.
 */
@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthRepository) {}

  @Get()
  @ApiOperation({ summary: 'Liveness probe: is the app up and the database reachable?' })
  async check(): Promise<{ status: string; database: string }> {
    await this.health.ping();
    return { status: 'ok', database: 'up' };
  }
}
