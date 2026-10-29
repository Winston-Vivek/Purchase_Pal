#!/usr/bin/env node
/**
 * Proofly phase gate runner.
 *
 * docs/plan.md describes seven phases, each ending in a gate. Prose gates are
 * easy to wave through under time pressure — this makes them executable, so a
 * phase is "passed" only when the checks actually pass.
 *
 *   node gates/run-gate.mjs --status     the board: phases, slices, test counts
 *   node gates/run-gate.mjs day3         run Day 3's gate
 *   node gates/run-gate.mjs day3 --quick skip the slow suites (lint/build/files only)
 *   node gates/run-gate.mjs --ci        re-run every phase already marked passed
 *
 * Exit code 0 only if every check passed, so CI can depend on it.
 */

import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// The decisions live in checks.mjs so they can be tested without spawning a
// server — see checks.test.mjs. This file does the I/O and the printing.
import { coverageFor, expandIds, matchIds, statusOf, summarise, tddHistory } from './checks.mjs';
import { collectTestNames } from './suites.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG = JSON.parse(readFileSync(join(ROOT, 'gates/phases.json'), 'utf8'));

const C = process.stdout.isTTY
  ? { dim: '\x1b[2m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', bold: '\x1b[1m', off: '\x1b[0m' }
  : { dim: '', red: '', green: '', yellow: '', bold: '', off: '' };

const PASS = `${C.green}✓${C.off}`;
const FAIL = `${C.red}✗${C.off}`;
const SKIP = `${C.yellow}−${C.off}`;

function sh(command, cwd = ROOT) {
  return execSync(command, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

// ---------------------------------------------------------------- checks ---

const CHECKS = {
  files({ paths, label }) {
    const missing = paths.filter((p) => !existsSync(join(ROOT, p)));
    return missing.length
      ? { ok: false, label, detail: `missing: ${missing.join(', ')}` }
      : { ok: true, label, detail: `${paths.length} present` };
  },

  command({ run, cwd, label }) {
    try {
      sh(run, join(ROOT, cwd ?? '.'));
      return { ok: true, label };
    } catch (error) {
      const output = `${error.stdout ?? ''}${error.stderr ?? ''}`.trim().split('\n').slice(-4).join('\n        ');
      return { ok: false, label, detail: output || `exit ${error.status}` };
    }
  },

  'test-ids'({ ids, suites, label }, cache) {
    const expected = expandIds(ids);
    const all = [];
    const unavailable = [];

    for (const suiteName of suites) {
      if (!cache.has(suiteName)) cache.set(suiteName, collectTestNames(suiteName));
      const result = cache.get(suiteName);
      if (!result.available) unavailable.push(result.reason);
      else all.push(...result.names);
    }

    const { missing, failing } = matchIds(expected, all);

    const parts = [];
    if (unavailable.length) parts.push(unavailable.join('; '));
    if (missing.length) parts.push(`no test named for ${missing.length}: ${summarise(missing)}`);
    if (failing.length) parts.push(`${C.red}failing${C.off} ${failing.length}: ${summarise(failing)}`);

    return {
      ok: missing.length === 0 && failing.length === 0 && unavailable.length === 0,
      label,
      detail: parts.join(' · ') || `${expected.length}/${expected.length} passing`,
    };
  },

  coverage({ pattern, minLines, minBranches, label }) {
    try {
      sh(
        'npx jest --coverage --coverageReporters=json-summary --passWithNoTests',
        join(ROOT, 'apps/api'),
      );
    } catch {
      return { ok: false, label, detail: 'coverage run failed' };
    }

    const summaryPath = join(ROOT, 'apps/api/coverage/coverage-summary.json');
    if (!existsSync(summaryPath)) return { ok: false, label, detail: 'no coverage summary produced' };

    const measured = coverageFor(JSON.parse(readFileSync(summaryPath, 'utf8')), pattern);

    if (measured === null) {
      return { ok: false, label, detail: `no files matching "${pattern}" are covered yet` };
    }

    const { lines, branches } = measured;
    const ok = lines >= minLines && branches >= minBranches;

    return {
      ok,
      label,
      detail: `lines ${lines.toFixed(1)}% (need ${minLines}) · branches ${branches.toFixed(1)}% (need ${minBranches})`,
    };
  },

  'tdd-history'({ areas, label }) {
    let log;
    try {
      log = sh('git log --reverse --format=%s').trim().split('\n');
    } catch {
      return { ok: false, label, detail: 'not a git repository' };
    }

    const { wrong, unstarted } = tddHistory(log, areas);

    if (wrong.length) {
      return { ok: false, label, detail: `${C.red}code before test${C.off}: ${wrong.join(', ')}` };
    }
    if (unstarted.length === areas.length) {
      return { ok: false, label, detail: `not started: ${unstarted.join(', ')}` };
    }
    const done = areas.length - unstarted.length;
    return {
      ok: unstarted.length === 0,
      label,
      detail: unstarted.length
        ? `${done}/${areas.length} areas red-then-green · not started: ${unstarted.join(', ')}`
        : `all ${areas.length} areas start with a test: commit`,
    };
  },

  'testcases-status'({ ids, label }) {
    const file = join(ROOT, CONFIG.testCasesFile);
    if (!existsSync(file)) return { ok: false, label, detail: `${CONFIG.testCasesFile} not found` };

    const expected = expandIds(ids);
    const { absent, notRun, failed } = statusOf(readFileSync(file, 'utf8'), expected);

    const parts = [];
    if (absent.length) parts.push(`not in the file: ${summarise(absent)}`);
    if (notRun.length) parts.push(`still "Not run": ${notRun.length} (${summarise(notRun)})`);
    if (failed.length) parts.push(`${C.red}recorded Fail${C.off}: ${summarise(failed)}`);

    return {
      ok: parts.length === 0,
      label,
      detail: parts.join(' · ') || `${expected.length} cases have a real result`,
    };
  },
};

// ----------------------------------------------------------------- views ---

function showStatus() {
  console.log(`\n${C.bold}${CONFIG.project} — phase board${C.off}\n`);

  for (const phase of CONFIG.phases) {
    const mark = phase.status === 'passed' ? PASS : phase.status === 'in-progress' ? '•' : SKIP;
    console.log(`  ${mark} ${C.bold}${phase.id}${C.off}  ${phase.title} ${C.dim}(${phase.status})${C.off}`);

    for (const slice of phase.slices) {
      const count = expandIds(slice.testIds).length;
      const cases = count ? `${count} cases` : 'no test cases';
      const tdd = slice.tdd ? '' : `${C.dim} · setup${C.off}`;
      const done = slice.done ? PASS : ' ';
      console.log(`      ${done} ${phase.id}.${slice.id}  ${slice.title.padEnd(26)} ${C.dim}${cases}${C.off}${tdd}`);
    }
    console.log(`      ${C.dim}gate: ${phase.gate.length} checks${C.off}\n`);
  }

  console.log(`  Run one with: ${C.bold}npm run gate day3${C.off}\n`);
}

function runGate(phaseId, quick) {
  const phase = CONFIG.phases.find((p) => p.id === phaseId);
  if (!phase) {
    console.error(`\n${FAIL} Unknown phase "${phaseId}". Known: ${CONFIG.phases.map((p) => p.id).join(', ')}\n`);
    process.exit(2);
  }

  console.log(`\n${C.bold}${CONFIG.project} — gate: ${phase.id} · ${phase.title}${C.off}\n`);

  const cache = new Map();
  const results = [];
  const slow = new Set(['test-ids', 'coverage']);

  for (const check of phase.gate) {
    if (quick && slow.has(check.kind)) {
      console.log(`  ${SKIP} ${check.label} ${C.dim}(skipped by --quick)${C.off}`);
      continue;
    }

    const handler = CHECKS[check.kind];
    if (!handler) {
      results.push({ ok: false, label: check.label, detail: `unknown check kind "${check.kind}"` });
      continue;
    }

    // Only draw the in-progress line on a terminal; piping to a file or CI log
    // would otherwise keep both the "…" line and the result.
    const live = process.stdout.isTTY;
    if (live) process.stdout.write(`  ${C.dim}…${C.off} ${check.label}`);
    const result = handler(check, cache);
    process.stdout.write(`${live ? '\r\x1b[2K' : ''}  ${result.ok ? PASS : FAIL} ${result.label}\n`);
    if (result.detail) console.log(`      ${C.dim}${result.detail}${C.off}`);
    results.push(result);
  }

  const failed = results.filter((r) => !r.ok);
  console.log();

  if (failed.length === 0) {
    const scope = quick ? ' (quick run — slow checks skipped)' : '';
    console.log(`  ${C.green}${C.bold}GATE PASSED${C.off} — ${results.length} checks${scope}\n`);
    return 0;
  }

  console.log(`  ${C.red}${C.bold}GATE FAILED${C.off} — ${failed.length} of ${results.length} checks did not pass:`);
  for (const f of failed) console.log(`      ${FAIL} ${f.label}`);
  console.log(`\n  ${C.dim}Phase ${phase.id} is not done. Fix the above, then run the gate again.${C.off}\n`);
  return 1;
}

/**
 * Regression mode for CI.
 *
 * Runs the gate of every phase marked "passed" in phases.json. Once a phase is
 * signed off, its gate becomes a permanent guard: a later change that breaks
 * Day 3's date rules fails the build even though the work in flight is Day 5.
 */
function runPassedPhases() {
  const passed = CONFIG.phases.filter((p) => p.status === 'passed');

  if (passed.length === 0) {
    console.log(`\n  ${SKIP} No phase is marked passed yet — nothing to guard.\n`);
    return 0;
  }

  console.log(`\n${C.bold}${CONFIG.project} — regression check over ${passed.length} passed phase(s)${C.off}`);

  let worst = 0;
  for (const phase of passed) {
    worst = Math.max(worst, runGate(phase.id, false));
  }

  if (worst === 0) {
    console.log(`  ${C.green}${C.bold}All passed phases still hold.${C.off}\n`);
  } else {
    console.log(`  ${C.red}${C.bold}A previously passed phase has regressed.${C.off}\n`);
  }
  return worst;
}

// ------------------------------------------------------------------ main ---

const args = process.argv.slice(2);
const quick = args.includes('--quick');
const phaseId = args.find((a) => !a.startsWith('--'));

if (args.includes('--ci')) {
  process.exit(runPassedPhases());
}

if (!phaseId || args.includes('--status')) {
  showStatus();
  process.exit(0);
}

process.exit(runGate(phaseId, quick));
