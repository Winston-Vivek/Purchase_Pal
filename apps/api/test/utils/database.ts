import { PrismaService } from '../../src/prisma/prisma.service';

/**
 * Empties every application table, leaving the schema and the migration
 * history intact.
 *
 * The table list is read from Postgres rather than hard-coded, so a table added
 * in a later slice is cleaned automatically and cannot leak rows into the next
 * test. CASCADE handles the foreign keys; RESTART IDENTITY resets sequences so
 * ordering assertions do not depend on how many tests ran before.
 */
export async function truncateAll(prisma: PrismaService): Promise<void> {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
  `;

  if (tables.length === 0) return;

  const list = tables.map((t) => `"public"."${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}
