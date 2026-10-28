# Phase gates

`docs/plan.md` describes seven phases, each ending in a gate. Prose gates are easy to wave through
when a day runs late. These are executable: a phase is done when its checks pass, not when it feels
done.

```bash
npm run gate:status        # the board — phases, slices, how many cases each owns
npm run gate day3          # run Day 3's gate
npm run gate day3 --quick  # lint/build/files only; skip the slow suites
npm run gate -- --ci       # re-run every phase already marked passed
```

Exit code is 0 only if every check passed, so CI can depend on it.

## The two files

| File | What it is |
| --- | --- |
| `phases.json` | The machine-readable form of `docs/plan.md`: phases, their slices, the test case IDs each slice owns, and the gate checks |
| `run-gate.mjs` | The runner |

`docs/plan.md` stays the narrative — why the work is ordered this way. `phases.json` is what gets
checked. When they disagree, that is a bug in one of them.

Test case IDs are written as ranges (`UT-DATE-01..24`) and expanded by the runner, so the 77 cases
Day 3 owns stay readable as five lines.

## Check kinds

| Kind | Passes when |
| --- | --- |
| `files` | Every listed path exists |
| `command` | The command exits 0 (lint, build, a grep that must find nothing) |
| `test-ids` | Every listed case ID appears in a real test name **and** that test passes |
| `coverage` | Lines and branches for files matching a pattern clear a threshold |
| `tdd-history` | For each area, the **first** commit touching it is a `test(` one, not a `feat(` one |
| `testcases-status` | No listed ID is still `Not run` in `docs/test-cases.md`, and none is recorded `Fail` |

The last two are the ones worth having. `test-ids` makes it impossible to pass a gate by writing code
without the tests from `docs/test-cases.md` — a missing ID is reported by name. `tdd-history` reads
`git log` and fails if the first commit for an area was `feat(`, which is what writing code before
its failing test looks like after the fact.

## Adding a phase or a check

Edit `phases.json`. A new check kind means a new function in the `CHECKS` map in `run-gate.mjs`,
taking the check object and returning `{ ok, label, detail }`.

## Marking a phase passed

Set `"status": "passed"` in `phases.json` **after** its gate reports PASSED. From then on
`--ci` re-runs that gate on every push, so a later change cannot quietly break it.

## What this does not do

It does not judge design quality, UX, or whether the code is explainable in a demo — those stay human
review, which is what the "you read the diff and say next" step in `docs/plan.md` is for.
