import { DataSource } from 'typeorm';

/**
 * Empties every application table, leaving the schema and migration history.
 *
 * The table list comes from Postgres rather than a hard-coded array, so a table
 * added in a later slice is cleaned automatically and cannot leak rows into the
 * next test.
 */
export async function truncateAll(dataSource: DataSource): Promise<void> {
  const tables = await dataSource.query<{ tablename: string }[]>(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> 'migrations'
  `);

  if (tables.length === 0) return;

  const list = tables.map((t) => `"public"."${t.tablename}"`).join(', ');
  await dataSource.query(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}
