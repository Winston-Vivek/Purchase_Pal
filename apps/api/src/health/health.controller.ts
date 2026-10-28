import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * Not in the API contract (§9) — operational, not a product feature. Docker,
 * CI and the Day 7 fresh-clone check all need one cheap call that proves the
 * app booted and reached the database.
 *
 * TODO(Slice 3): mark @Public() once the global auth guard exists.
 */
@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  async check(): Promise<{ status: string; database: string }> {
    await this.dataSource.query('SELECT 1');
    return { status: 'ok', database: 'up' };
  }
}
