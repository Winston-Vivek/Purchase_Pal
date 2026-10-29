import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { coverageFor, expandIds, matchIds, statusOf, tddHistory } from './checks.mjs';

/**
 * Tests for the gate itself.
 *
 * Everything else in this project is trusted because a gate said so, which
 * makes the gate the one thing whose failure would be invisible. These feed it
 * a missing test, a failing test, a stale status column and a feat-before-test
 * history, and require it to refuse each one.
 */

describe('expandIds', () => {
  it('expands a range, keeping the zero padding', () => {
    assert.deepEqual(expandIds(['UT-DATE-08..11']), [
      'UT-DATE-08',
      'UT-DATE-09',
      'UT-DATE-10',
      'UT-DATE-11',
    ]);
  });

  it('passes a plain id through and handles several patterns', () => {
    assert.deepEqual(expandIds(['API-ERR-01..02', 'API-AUTH-12']), [
      'API-ERR-01',
      'API-ERR-02',
      'API-AUTH-12',
    ]);
  });

  it('is empty for no patterns, rather than throwing', () => {
    assert.deepEqual(expandIds(undefined), []);
    assert.deepEqual(expandIds([]), []);
  });
});

describe('matchIds', () => {
  const collected = [
    { name: 'UT-DATE-01 start 2026-01-15 + 12 months is 2027-01-14', passed: true },
    { name: 'UT-DATE-02 clamps to the end of February', passed: false },
  ];

  it('passes when every id has a test and all of them pass', () => {
    assert.deepEqual(matchIds(['UT-DATE-01'], collected), { missing: [], failing: [] });
  });

  it('REFUSES a case that has no test at all', () => {
    // The failure this exists to prevent: writing the code, skipping the test,
    // and the gate waving it through because nothing was red.
    const result = matchIds(['UT-DATE-03'], collected);
    assert.deepEqual(result.missing, ['UT-DATE-03']);
    assert.deepEqual(result.failing, []);
  });

  it('REFUSES a case whose test is failing', () => {
    const result = matchIds(['UT-DATE-02'], collected);
    assert.deepEqual(result.failing, ['UT-DATE-02']);
    assert.deepEqual(result.missing, []);
  });

  it('refuses a case where one of several matching tests fails', () => {
    const mixed = [
      { name: 'API-PUR-02 computed fields', passed: true },
      { name: 'API-PUR-02 again, elsewhere', passed: false },
    ];
    assert.deepEqual(matchIds(['API-PUR-02'], mixed).failing, ['API-PUR-02']);
  });
});

describe('statusOf', () => {
  const markdown = [
    '| ID | Scenario | Expected | Pri | Status |',
    '| --- | --- | --- | --- | --- |',
    '| UT-DATE-01 | start 2026-01-15 | 2027-01-14 | P0 | Pass 2026-10-28 |',
    '| UT-DATE-02 | clamps | 2026-02-28 | P0 | Not run |',
    '| UT-DATE-03 | leap day | 2025-02-28 | P0 | Fail D-01 |',
  ].join('\n');

  it('accepts a case with a real recorded result', () => {
    assert.deepEqual(statusOf(markdown, ['UT-DATE-01']), { absent: [], notRun: [], failed: [] });
  });

  it('REFUSES a case still marked "Not run"', () => {
    assert.deepEqual(statusOf(markdown, ['UT-DATE-02']).notRun, ['UT-DATE-02']);
  });

  it('REFUSES a case recorded as a failure', () => {
    assert.deepEqual(statusOf(markdown, ['UT-DATE-03']).failed, ['UT-DATE-03']);
  });

  it('REFUSES a case that is not in the file at all', () => {
    // A gate that only looks at rows it finds can be passed by deleting a row.
    assert.deepEqual(statusOf(markdown, ['UT-DATE-99']).absent, ['UT-DATE-99']);
  });

  it('is not fooled by an id appearing inside prose elsewhere', () => {
    const withProse = `${markdown}\n\n> Note: UT-DATE-99 is covered by the Day 7 gate.`;
    assert.deepEqual(statusOf(withProse, ['UT-DATE-99']).absent, ['UT-DATE-99']);
  });
});

describe('statusOf across different tables', () => {
  // docs/uat-report.md keeps its verdict in Result and ends in Evidence.
  const uat = [
    '| ID | Scenario | Steps | Expected | Actual | Result | Evidence |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    '| UAT-01 | Register and sign in | … | … | Worked | Pass | shot.png |',
    '| UAT-02 | Add a purchase | … | … | | | |',
    '| UAT-03 | Upload a receipt | … | … | Wrong file | Fail D-02 | |',
  ].join('\n');

  it('reads the named column, not the last but one', () => {
    // Counting backwards would read Evidence and call UAT-01 unrecorded.
    assert.deepEqual(statusOf(uat, ['UAT-01'], 'Result'), { absent: [], notRun: [], failed: [] });
  });

  it('REFUSES a scenario with an empty Result', () => {
    assert.deepEqual(statusOf(uat, ['UAT-02'], 'Result').notRun, ['UAT-02']);
  });

  it('REFUSES a scenario recorded as a failure', () => {
    assert.deepEqual(statusOf(uat, ['UAT-03'], 'Result').failed, ['UAT-03']);
  });

  it('still defaults to Status for docs/test-cases.md', () => {
    const cases = [
      '| ID | Input | Expected | Pri | Status |',
      '| --- | --- | --- | --- | --- |',
      '| UT-DATE-01 | x | y | P0 | Pass 2026-10-28 |',
    ].join('\n');
    assert.deepEqual(statusOf(cases, ['UT-DATE-01']), { absent: [], notRun: [], failed: [] });
  });
});

describe('tddHistory', () => {
  it('accepts an area whose first commit is a test', () => {
    const log = ['test(dates): UT-DATE-01..24', 'feat(dates): DatesService'];
    assert.deepEqual(tddHistory(log, ['dates']), { wrong: [], unstarted: [] });
  });

  it('REFUSES an area whose first commit is a feat', () => {
    // This is what writing code before its failing test looks like afterwards.
    const log = ['feat(auth): register and login', 'test(auth): API-AUTH-01..12'];
    const result = tddHistory(log, ['auth']);
    assert.equal(result.wrong.length, 1);
    assert.match(result.wrong[0], /^auth /);
  });

  it('reports an area that has not been started', () => {
    assert.deepEqual(tddHistory(['test(dates): x'], ['purchases']).unstarted, ['purchases']);
  });

  it('is not fooled by another area with a similar name', () => {
    const log = ['feat(purchases-ui): dashboard', 'test(purchases): API-PUR-01..30'];
    assert.deepEqual(tddHistory(log, ['purchases']), { wrong: [], unstarted: [] });
  });
});

describe('coverageFor', () => {
  const summary = {
    total: { lines: { covered: 1, total: 100 }, branches: { covered: 1, total: 100 } },
    '/repo/src/common/dates/dates.service.ts': {
      lines: { covered: 90, total: 100 },
      branches: { covered: 8, total: 10 },
    },
    '/repo/src/elsewhere.ts': {
      lines: { covered: 0, total: 100 },
      branches: { covered: 0, total: 100 },
    },
  };

  it('totals only the files matching the pattern, ignoring "total"', () => {
    const result = coverageFor(summary, 'common/dates');
    assert.equal(result.lines, 90);
    assert.equal(result.branches, 80);
  });

  it('REFUSES to report coverage when nothing matches', () => {
    // Returning 100% for a path that does not exist would be the worst
    // possible answer: a green gate over code that was never measured.
    assert.equal(coverageFor(summary, 'does/not/exist'), null);
  });
});
