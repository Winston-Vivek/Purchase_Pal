import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttachmentsModule } from './attachments/attachments.module';
import { AuthModule } from './auth/auth.module';
import { DatesModule } from './common/dates/dates.module';
import { validateEnv } from './config/env.validation';
import { databaseOptions } from './database/data-source';
import { HealthModule } from './health/health.module';
import { PurchasesModule } from './purchases/purchases.module';
import { RepositoriesModule } from './repositories/repositories.module';
import { ServiceRecordsModule } from './service-records/service-records.module';
import { StorageModule } from './common/storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // npm scripts load the right file with dotenv-cli (.env, or .env.test for
      // e2e), so env is read in exactly one place.
      ignoreEnvFile: true,
      validate: validateEnv,
      cache: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        databaseOptions(config.getOrThrow<string>('DATABASE_URL')),
    }),
    RepositoriesModule,
    StorageModule,
    DatesModule,
    AuthModule,
    PurchasesModule,
    AttachmentsModule,
    ServiceRecordsModule,
    HealthModule,
  ],
})
export class AppModule {}
