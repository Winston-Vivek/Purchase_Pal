import 'reflect-metadata';
import { join } from 'node:path';
import { DataSource, DataSourceOptions } from 'typeorm';
import { Attachment } from '../attachments/attachment.entity';
import { Purchase } from '../purchases/purchase.entity';
import { ServiceRecord } from '../service-records/service-record.entity';
import { PasswordResetToken } from '../auth/password-reset-token.entity';
import { EmailChangeToken } from '../users/email-change-token.entity';
import { SentReminder } from '../reminders/sent-reminder.entity';
import { User } from '../users/user.entity';

/**
 * One set of options for both the running app and the migration CLI, so the
 * schema the tests run against cannot drift from the one migrations build.
 */
export function databaseOptions(url: string, ssl = false): DataSourceOptions {
  return {
    type: 'postgres',
    url,
    /**
     * A managed Postgres refuses an unencrypted connection, and a local one in
     * Docker has no certificate to offer — so this is configuration, not a
     * guess. Certificates are verified when it is on: `rejectUnauthorized`
     * stays at its default, because turning it off would accept any
     * certificate at all and make the encryption decorative.
     */
    ssl: ssl ? {} : false,
    entities: [
      User,
      Purchase,
      Attachment,
      ServiceRecord,
      PasswordResetToken,
      EmailChangeToken,
      SentReminder,
    ],
    // Matches .ts under ts-node and .js from dist.
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
    // Never true, in any environment. It alters schemas behind the migrations'
    // back and can drop columns (db-use-migrations).
    synchronize: false,
  };
}

/**
 * Used only by the TypeORM CLI.
 *
 * Reads process.env directly rather than a file, so the same entry point works
 * locally through dotenv-cli and in a deployed container, where there is no
 * .env and the environment comes from the platform.
 */
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set — run through an npm script.');

export default new DataSource(databaseOptions(url, process.env.DATABASE_SSL === 'true'));
