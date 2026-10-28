import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Liveness probe. Not part of the API contract in requirements §9 — it is
 * operational, not a product feature — but it earns its place: docker, CI and
 * the Day 7 fresh-clone check all need one cheap call that proves the app
 * booted AND reached the database.
 *
 * TODO(Slice 3): mark with @Public() once the global auth guard exists, or
 * this becomes the one endpoint that locks out the monitoring that needs it.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<{ status: string; database: string }> {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', database: 'up' };
  }
}
