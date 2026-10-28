/**
 * Runs before every e2e test file.
 *
 * The suite TRUNCATEs every table between tests. That is fine against
 * proofly_test and catastrophic against a database holding real purchases, so
 * the connection string is checked before a single test is allowed to run.
 * A typo in .env.test should cost a red run, not someone's data.
 */
const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    'DATABASE_URL is not set for the e2e run.\n' +
      'Run the suite through its npm script, which loads .env.test:\n' +
      '  npm run test:e2e\n',
  );
}

if (!url.includes('proofly_test')) {
  throw new Error(
    `Refusing to run the e2e suite against "${url}".\n` +
      'These tests truncate every table. The database name must contain ' +
      '"proofly_test" (see .env.test.example).\n',
  );
}
