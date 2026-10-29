#!/usr/bin/env node
/**
 * Writes the Status column of docs/test-cases.md from what the suites actually
 * report.
 *
 *   npm run testcases:sync      update the file
 *   npm run testcases:check     report drift, change nothing, exit 1 if any
 *
 * Until now that column was maintained by hand after each run. Hand-maintained
 * truth drifts, and this is the one place in the project where a wrong entry
 * is indistinguishable from a right one — a case marked "Pass 2026-10-28" is
 * taken at face value by the gate, by UAT and by anyone reading the repo.
 *
 * The one rule that matters: a case with NO matching test is never marked
 * passed. It keeps whatever it had, and the gate goes on refusing it.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, collectTestNames } from './suites.mjs';

const FILE = join(ROOT, 'docs/test-cases.md');
const SUITES = ['unit', 'e2e', 'web', 'playwright'];
const ROW = /^\| ([A-Z]+(?:-[A-Z]+)*-\d+) \|/;

const today = new Date().toISOString().slice(0, 10);
const check = process.argv.includes('--check');

const collected = [];
const unavailable = [];

for (const suite of SUITES) {
  const result = collectTestNames(suite);
  if (result.available) collected.push(...result.names);
  else unavailable.push(result.reason);
}

if (unavailable.length > 0) {
  console.error('Cannot sync: not every suite could run.');
  for (const reason of unavailable) console.error(`  - ${reason}`);
  process.exit(2);
}

const lines = readFileSync(FILE, 'utf8').split('\n');
const changes = [];

for (const [index, line] of lines.entries()) {
  const id = ROW.exec(line)?.[1];
  if (!id) continue;

  const matches = collected.filter((test) => test.name.includes(id));
  // No test, no claim. This is the whole point of the script.
  if (matches.length === 0) continue;

  const cells = line.split('|');
  const statusIndex = cells.length - 2;
  const was = (cells[statusIndex] ?? '').trim();
  const now = matches.every((test) => test.passed) ? `Pass ${today}` : `Fail ${today}`;

  // Only the date moving is not worth reporting as drift.
  if (was.replace(/\d{4}-\d{2}-\d{2}/, '') === now.replace(/\d{4}-\d{2}-\d{2}/, '')) continue;

  changes.push({ id, was: was || '(blank)', now });
  cells[statusIndex] = ` ${now} `;
  lines[index] = cells.join('|');
}

if (changes.length === 0) {
  console.log(`test-cases.md matches the suites (${collected.length} test names read).`);
  process.exit(0);
}

for (const change of changes) {
  console.log(`  ${change.id.padEnd(14)} ${change.was}  ->  ${change.now}`);
}

if (check) {
  console.error(`\n${changes.length} case(s) disagree with the suites. Run: npm run testcases:sync`);
  process.exit(1);
}

writeFileSync(FILE, lines.join('\n'));
console.log(`\nUpdated ${changes.length} case(s) in docs/test-cases.md.`);
