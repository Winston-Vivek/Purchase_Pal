import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatesModule } from './common/dates/dates.module';
import { validateEnv } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';

/**
 * Feature modules get added here as each slice lands: auth, users, purchases,
 * attachments, service-records, dashboard (docs/plan.md, Days 3-4).
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // The npm scripts load the right file with dotenv-cli (.env, or .env.test
      // for the e2e suite), so there is exactly one place env is read from and
      // no quiet disagreement between Nest's loader and the Prisma CLI's.
      ignoreEnvFile: true,
      validate: validateEnv,
      cache: true,
    }),
    PrismaModule,
    DatesModule,
    HealthModule,
  ],
})
export class AppModule {}
