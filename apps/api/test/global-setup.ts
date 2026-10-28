import { execSync } from 'node:child_process';

/**
 * Brings the test database's schema up to date once per `npm run test:e2e`,
 * before any test file loads.
 *
 * `migrate deploy` (not `migrate dev`) is deliberate: it only applies existing
 * migrations and never generates, renames or resets anything, so a schema drift
 * fails the run loudly instead of being silently "fixed" in a way that would
 * not happen in production (db-use-migrations).
 */
export default function globalSetup(): void {
  const url = process.env.DATABASE_URL;

  if (!url?.includes('proofly_test')) {
    throw new Error(
      `Refusing to migrate "${url ?? '(unset)'}" — expected the proofly_test database.`,
    );
  }

  console.log('\n[e2e] applying migrations to proofly_test…');

  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: process.env,
  });
}
