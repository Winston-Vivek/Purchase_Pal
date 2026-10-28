import { execSync } from 'node:child_process';

/**
 * Brings proofly_test's schema up to date once per run, before any test loads.
 *
 * `migration:run` only applies existing migrations — it never generates or
 * resets, so schema drift fails the run loudly instead of being silently
 * "fixed" in a way production would never see (db-use-migrations).
 */
export default function globalSetup(): void {
  const url = process.env.DATABASE_URL;

  if (!url?.includes('proofly_test')) {
    throw new Error(
      `Refusing to migrate "${url ?? '(unset)'}" — expected the proofly_test database.`,
    );
  }

  console.log('\n[e2e] applying migrations to proofly_test…');

  execSync('npx typeorm-ts-node-commonjs -d src/database/data-source.ts migration:run', {
    stdio: 'inherit',
    env: process.env,
  });
}
