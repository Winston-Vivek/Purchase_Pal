import 'reflect-metadata';
import { join } from 'node:path';
import { DataSource, DataSourceOptions } from 'typeorm';
import { Attachment } from '../attachments/attachment.entity';
import { Purchase } from '../purchases/purchase.entity';
import { ServiceRecord } from '../service-records/service-record.entity';
import { PasswordResetToken } from '../auth/password-reset-token.entity';
import { User } from '../users/user.entity';

/**
 * One set of options for both the running app and the migration CLI, so the
 * schema the tests run against cannot drift from the one migrations build.
 */
export function databaseOptions(url: string): DataSourceOptions {
  return {
    type: 'postgres',
    url,
    entities: [User, Purchase, Attachment, ServiceRecord, PasswordResetToken],
    // Matches .ts under ts-node and .js from dist.
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
    // Never true, in any environment. It alters schemas behind the migrations'
    // back and can drop columns (db-use-migrations).
    synchronize: false,
  };
}

/** Used only by the TypeORM CLI, which loads env through dotenv-cli. */
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set — run through an npm script.');

export default new DataSource(databaseOptions(url));
