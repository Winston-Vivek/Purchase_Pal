/**
 * How to run each test suite so it reports machine-readable results.
 *
 * Shared by the gate and by sync-test-cases.mjs, so "what the suites say" has
 * one definition. Two readers of the same results cannot disagree.
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function sh(command, cwd = ROOT) {
  return execSync(command, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

// ---------------------------------------------------------------- suites ---

/**
 * How to run each suite so it emits machine-readable results. A suite that is
 * not built yet reports `available: false` rather than crashing the gate.
 */
export const SUITES = {
  unit: {
    cwd: 'apps/api',
    exists: () => existsSync(join(ROOT, 'apps/api/package.json')),
    run: (out) => `npx jest --passWithNoTests --json --outputFile=${out}`,
  },
  e2e: {
    cwd: 'apps/api',
    exists: () => existsSync(join(ROOT, 'apps/api/test/jest-e2e.json')),
    // Locally the connection string comes from .env.test. CI sets DATABASE_URL
    // directly and has no .env.test, so dotenv is only used when the file is
    // actually there — otherwise the suite would die on a missing file.
    run: (out) => {
      const jest = `jest --config ./test/jest-e2e.json --runInBand --json --outputFile=${out}`;
      return existsSync(join(ROOT, '.env.test'))
        ? `npx dotenv -e ../../.env.test -- ${jest}`
        : `npx ${jest}`;
    },
  },
  web: {
    cwd: 'apps/web',
    exists: () => existsSync(join(ROOT, 'apps/web/package.json')),
    run: (out) => `npx vitest run --reporter=json --outputFile=${out}`,
  },
  playwright: {
    cwd: '.',
    exists: () => existsSync(join(ROOT, 'e2e')),
    run: (out) => `npx playwright test --reporter=json > ${out}`,
  },
};

/** Collects every test name from a suite, with whether it passed. */
export function collectTestNames(suiteName) {
  const suite = SUITES[suiteName];
  if (!suite) return { available: false, reason: `unknown suite "${suiteName}"` };
  if (!suite.exists()) return { available: false, reason: `${suiteName} suite does not exist yet` };

  const dir = mkdtempSync(join(tmpdir(), 'proofly-gate-'));
  const outFile = join(dir, 'results.json');

  try {
    try {
      sh(suite.run(outFile), join(ROOT, suite.cwd));
    } catch {
      // A failing suite still writes its report; that is what we want to read.
    }

    if (!existsSync(outFile)) {
      return { available: false, reason: `${suiteName} produced no report (did it fail to start?)` };
    }

    // A runner that prints anything before its report would otherwise make
    // this unparseable, and the gate would fail for a reason nobody could see.
    const raw = readFileSync(outFile, 'utf8');
    const report = JSON.parse(raw.slice(raw.indexOf('{')));
    const names = [];

    // Jest and Vitest share this shape; Playwright's differs.
    for (const file of report.testResults ?? []) {
      for (const assertion of file.assertionResults ?? file.tests ?? []) {
        names.push({
          name: assertion.fullName ?? assertion.title ?? '',
          passed: assertion.status === 'passed',
        });
      }
    }
    for (const spec of report.suites ?? []) {
      walkPlaywright(spec, names);
    }

    return { available: true, names };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function walkPlaywright(node, out) {
  for (const spec of node.specs ?? []) {
    out.push({ name: spec.title ?? '', passed: spec.ok === true });
  }
  for (const child of node.suites ?? []) walkPlaywright(child, out);
}

