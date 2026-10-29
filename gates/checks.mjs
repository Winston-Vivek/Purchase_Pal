/**
 * The gate's decisions, separated from its I/O.
 *
 * run-gate.mjs reads files, runs suites and prints; everything that decides
 * pass or fail lives here, as functions over plain data. That is what makes
 * the gate itself testable — see checks.test.mjs, which feeds it a missing
 * test, a failing test and a stale status column and requires it to say no.
 *
 * A gate nobody has tried to fool is a gate nobody knows works.
 */

/** "UT-DATE-01..24" -> ["UT-DATE-01", … "UT-DATE-24"]. Plain IDs pass through. */
export function expandIds(patterns) {
  const out = [];

  for (const pattern of patterns ?? []) {
    const range = /^(.*?)(\d+)\.\.(\d+)$/.exec(pattern);
    if (!range) {
      out.push(pattern);
      continue;
    }

    const [, prefix, from, to] = range;
    const width = from.length;
    for (let n = Number(from); n <= Number(to); n += 1) {
      out.push(`${prefix}${String(n).padStart(width, '0')}`);
    }
  }

  return out;
}

export function summarise(ids, max = 4) {
  return ids.length <= max ? ids.join(', ') : `${ids.slice(0, max).join(', ')}, +${ids.length - max} more`;
}

/**
 * Which of the expected case IDs have no test at all, and which have one that
 * failed. Both are failures, and they are reported apart because the fixes
 * differ: write the test, or fix the code.
 */
export function matchIds(expectedIds, collected) {
  const missing = [];
  const failing = [];

  for (const id of expectedIds) {
    const matches = collected.filter((t) => t.name.includes(id));
    if (matches.length === 0) missing.push(id);
    else if (matches.some((t) => !t.passed)) failing.push(id);
  }

  return { missing, failing };
}

/**
 * Reads the Status column of docs/test-cases.md for the given IDs.
 *
 * A case that is absent from the file is as much a problem as one still
 * marked "Not run": the gate is checking that a human-readable record exists
 * and is current, not merely that some string is present.
 */
export function statusOf(testCasesMarkdown, ids) {
  const lines = testCasesMarkdown.split('\n');
  const absent = [];
  const notRun = [];
  const failed = [];

  for (const id of ids) {
    const row = lines.find((line) => line.startsWith(`| ${id} |`));
    if (!row) {
      absent.push(id);
      continue;
    }

    const cells = row.split('|').map((cell) => cell.trim());
    const status = cells[cells.length - 2] ?? '';

    if (status === '' || /not run/i.test(status)) notRun.push(id);
    else if (/^fail/i.test(status)) failed.push(id);
  }

  return { absent, notRun, failed };
}

/**
 * For each area, whether its first commit was a test. `git log --reverse`
 * order in, so this is the TDD claim checked against history rather than
 * taken on trust.
 */
export function tddHistory(subjectsOldestFirst, areas) {
  const wrong = [];
  const unstarted = [];

  for (const area of areas) {
    const pattern = new RegExp(`^(test|feat)\\(${area}\\)`);
    const first = subjectsOldestFirst.find((subject) => pattern.test(subject));

    if (!first) unstarted.push(area);
    else if (!first.startsWith('test(')) wrong.push(`${area} (starts with "${first.slice(0, 40)}…")`);
  }

  return { wrong, unstarted };
}

/** Totals lines and branches across the files matching `pattern`. */
export function coverageFor(summary, pattern) {
  const files = Object.entries(summary).filter(
    ([path]) => path !== 'total' && path.includes(pattern),
  );

  if (files.length === 0) return null;

  const totals = files.reduce(
    (acc, [, metrics]) => ({
      lines: {
        covered: acc.lines.covered + metrics.lines.covered,
        total: acc.lines.total + metrics.lines.total,
      },
      branches: {
        covered: acc.branches.covered + metrics.branches.covered,
        total: acc.branches.total + metrics.branches.total,
      },
    }),
    { lines: { covered: 0, total: 0 }, branches: { covered: 0, total: 0 } },
  );

  const percent = (covered, total) => (total === 0 ? 100 : (covered / total) * 100);

  return {
    lines: percent(totals.lines.covered, totals.lines.total),
    branches: percent(totals.branches.covered, totals.branches.total),
  };
}
