import { readFileSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

/**
 * Runs the journeys against a real stack: the built API on 3100 and the Vite
 * dev server on 5199, which proxies /api to it so the session cookie stays
 * first-party (D-04).
 *
 * The API port is deliberately not 3000 — a developer's own `npm run start:dev`
 * usually holds that, and a suite that fights for a port fails for the wrong
 * reason.
 */
const API_PORT = 3100;
const WEB_PORT = 5199;

/** .env, parsed without a dependency: KEY=VALUE lines, # comments ignored. */
function env(): Record<string, string> {
  const values: Record<string, string> = {};

  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match?.[1]) values[match[1]] = (match[2] ?? '').trim();
  }

  return values;
}

export default defineConfig({
  testDir: './e2e',
  // Runs even when a test failed part-way through its own cleanup.
  globalTeardown: './e2e/global-teardown.ts',
  // Serial: the journeys share one seeded account, and two tests editing the
  // same purchase at once would fail for a reason that is not a bug.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
      // Without this the desktop project also runs the phone journey, at the
      // wrong width, and fails for a reason that is not a bug.
      testIgnore: /mobile\.spec\.ts/,
    },
    {
      name: 'mobile',
      use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 390, height: 844 } },
      testMatch: /mobile\.spec\.ts/,
    },
  ],

  webServer: [
    {
      command: 'node apps/api/dist/main.js',
      url: `http://localhost:${API_PORT}/api/v1/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        ...env(),
        PORT: String(API_PORT),
        NODE_ENV: 'development',
        // Nineteen journeys sign in once each from one address, which a
        // realistic ceiling would refuse — for behaving like a test suite.
        // The limit itself is proved by API-THR-01..03, against an app built
        // with a low one on purpose.
        THROTTLE_AUTH_LIMIT: '100000',
      },
    },
    {
      command: `npm --prefix apps/web run dev -- --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: { VITE_API_TARGET: `http://localhost:${API_PORT}` },
    },
  ],
});
