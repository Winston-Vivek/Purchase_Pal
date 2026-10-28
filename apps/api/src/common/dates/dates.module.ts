import { Module } from '@nestjs/common';
import { CLOCK, SystemClock } from './clock';
import { DatesService } from './dates.service';

/**
 * Exports CLOCK as well as the service, so an e2e test can override the token
 * and pin "today" to 2026-10-27 for the whole application.
 */
@Module({
  providers: [DatesService, { provide: CLOCK, useClass: SystemClock }],
  exports: [DatesService, CLOCK],
})
export class DatesModule {}
