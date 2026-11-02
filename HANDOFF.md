# Session Handoff

## Objective

Close out Day 7 of the Proofly MVP delivery plan: write the five delivery documents (`architecture.md`, `security.md`, `decisions.md`, `demo-script.md`, `CHANGELOG.md`) that the Day 7 gate requires, while the user runs UAT-01…13 against running backend/frontend servers. This superseded the session's earlier objective (auditing the user's improvement plan and fixing what the fresh-clone check exposed), which is now finished.

## Current Status

Days 1–6 are all gated and passing. Day 7 is the only open phase. This session found and fixed a critical pre-existing defect (an uncommitted storage module), added test coverage to the gate runner itself, automated the test-case status column, and fixed a bug in the Day 7 gate's own UAT check. Both app servers are currently running (API on port 3001, web on 5173) with seeded demo data, started so the user can run UAT. `docs/uat-report.md` has its header filled in (build commit, tester, environment, accounts) but the 13 UAT verdicts are still blank, pending the user. `docs/decisions.md` was just written (157 lines, new file, uncommitted) — the first of the five required delivery documents. `architecture.md`, `security.md`, `demo-script.md`, and `CHANGELOG.md` have not been started. The session was in the middle of this document-writing pass when compaction occurred.

## Implementation Plan

1. `docs/decisions.md` — done
2. `docs/architecture.md` (request-flow + ER diagrams) — next
3. `docs/security.md`
4. `docs/demo-script.md`
5. `CHANGELOG.md` (include known limitations: Receipt fieldset absent from add-purchase form, host-port collision on a second checkout, stale port 3000)
6. User runs UAT-01…13 against `http://localhost:5173`, records verdicts in `docs/uat-report.md`
7. Re-run `npm run gate day7` to confirm all checks pass
8. Fix any Critical/High defect found in UAT, test-first
9. Tag `v1.0.0`
10. Deferred, user's call: set up a git remote so CI runs; add commit SHA to evidence lines (shared hook across projects); formalise the three manual mutation tests already proven by hand

## Completed

- [x] Found and fixed critical defect: `.gitignore`'s bare `storage/` entry hid `apps/api/src/common/storage/` from git since Day 4, so a fresh clone could not build the API (commit `41f010c`)
- [x] Verified the fix from a second clean clone: build clean, 25/25 unit tests, health `{"status":"ok","database":"up"}`
- [x] Extracted gate decision logic into `gates/checks.mjs` and `gates/suites.mjs`; rewired `gates/run-gate.mjs` to import them instead of keeping duplicate logic; added `gates/checks.test.mjs` (22 tests) (commit `d96d366`)
- [x] Re-ran all six phase gates with `--quick` after the refactor — all still pass
- [x] Added `gates/sync-test-cases.mjs` (`testcases:check` / `testcases:sync`); proved it catches a false `Fail` (exit 1) and repairs a stale `Not run`
- [x] Fixed README setup gaps (web + root install, seed, both servers, command list) and removed `container_name: proofly-db` from `docker-compose.yml` (commit `23ede49`)
- [x] Re-verified the fixed README from a third clean clone: three installs, migrations, Vite 200, API health 200
- [x] Recorded NFR-12 as `Pass 2026-10-29` in `docs/test-cases.md`
- [x] Fixed `statusOf` to locate its column by header name instead of position, fixing the Day 7 gate's UAT check which was reading `docs/test-cases.md` instead of `docs/uat-report.md` (commit `7152424`)
- [x] Started backend (port 3001, worked around a stuck process on 3000) and frontend (port 5173) with seeded demo data for UAT
- [x] Filled in `docs/uat-report.md` header (build commit `7152424`, tester, date, environment, accounts) — uncommitted
- [x] Wrote `docs/decisions.md` (157 lines) — new file, uncommitted

## Remaining

- [~] Day 7 delivery docs: `decisions.md` done; `architecture.md`, `security.md`, `demo-script.md`, `CHANGELOG.md` not started
- [ ] User runs UAT-01…13 at `http://localhost:5173` (`demo@proofly.test` / `demo1234`; `other@proofly.test` for the UAT-08 privacy case) and records verdicts in `docs/uat-report.md`
- [ ] Fix any Critical/High defect found in UAT, test-first
- [ ] Tag `v1.0.0`
- [ ] Commit `docs/decisions.md` and the `docs/uat-report.md` header changes
- [!] Port 3000 held by a stale process (`pid 400458`) that could not be terminated — worked around by running the API on 3001
- [ ] (deferred, user's call) Set up a git remote so the existing CI workflow actually runs
- [ ] (deferred, user's call) Add commit SHA to `.ai/EVIDENCE.jsonl` lines — the writer script is shared across other projects
- [ ] Formalise the three mutation tests (BR-01 clamp, BR-03 inclusivity, magic bytes) that were only run by hand

## Files Changed

- `.gitignore`
  - Narrowed the `storage/` entry to `var/`.
  - It was unintentionally matching `apps/api/src/common/storage/`, hiding the whole storage module from git.
- `apps/api/src/common/storage/storage.interface.ts`, `local-disk.storage.ts`, `storage.module.ts`
  - Added to git tracking.
  - Were never committed due to the `.gitignore` bug; a fresh clone could not build the API without them.
- `gates/checks.mjs` (new)
  - Pure decision logic (`expandIds`, `matchIds`, `statusOf`, `coverageFor`, `tddHistory`) extracted from `run-gate.mjs`.
  - Makes the gate's decisions testable without spawning servers.
- `gates/checks.test.mjs` (new)
  - 22 `node:test` cases covering the gate's refusal conditions, including column-finding by header.
  - The gate certifies everything else and previously had zero tests of its own.
- `gates/suites.mjs` (new)
  - Suite-running logic extracted from `run-gate.mjs` for the same reason.
- `gates/run-gate.mjs`
  - Rewired to import from `checks.mjs`/`suites.mjs` instead of keeping local copies; `statusOf` now takes a file and column name.
  - Tests against a duplicate of the logic would prove nothing about the gate that actually runs; also fixes the Day 7 UAT check reading the wrong file/column.
- `gates/sync-test-cases.mjs` (new)
  - Reads real suite results and checks/syncs the Status column of `docs/test-cases.md`.
  - Removes hand-maintained, unverifiable test-case status.
- `package.json`
  - Added `gate:test`, `testcases:check`, `testcases:sync` scripts.
- `.github/workflows/ci.yml`
  - Added a `gate:test` step.
- `README.md`
  - Setup now covers root, `apps/api`, and `apps/web` installs, seeding, and starting both servers.
  - A fresh clone only ever installed `apps/api` and never started the frontend.
- `docker-compose.yml`
  - Removed `container_name: proofly-db`.
  - A second checkout couldn't start the database due to the name clash.
- `docs/test-cases.md`
  - NFR-12 marked `Pass 2026-10-29`.
  - Records the fresh-clone check's result.
- `docs/uat-report.md`
  - Header filled in: build commit `7152424`, tester, date, environment, accounts.
  - Prepares the file for the user to record UAT-01…13.
- `docs/decisions.md` (new, uncommitted)
  - Written, 157 lines, covering decisions with a real alternative (e.g. the ORM switch, duplicated date rules).
  - Required Day 7 delivery document.

## Files To Change

- `docs/architecture.md` — create; needs request-flow and ER diagrams
- `docs/security.md` — create
- `docs/demo-script.md` — create
- `CHANGELOG.md` — create; must note known limitations (no Receipt fieldset on the add-purchase form, host-port 5434 collision on a second checkout, stale port 3000)
- `docs/uat-report.md` — UAT-01…13 verdicts still need to be filled in by the user
- `docs/test-cases.md` — may need another `testcases:sync` pass if UAT turns up a defect that gets fixed

## Decisions & Findings

- Root cause of the critical defect: `.gitignore`'s bare `storage/` line matched `apps/api/src/common/storage/`; 265 green local tests said nothing because the files were present in the working tree, never in git, since Day 4.
- Gate tests only count if they exercise the real code path — the initial `checks.mjs` extraction was inert until `run-gate.mjs` was rewired to import from it rather than keep a parallel copy.
- `statusOf` is now stricter than the inline logic it replaced (requires a row literally starting `| ID |`, versus previously matching an ID mentioned anywhere in prose); re-verified against all six day gates with `--quick` to confirm no regression.
- The Day 7 gate's UAT check was both reading the wrong file (`test-cases.md` instead of `uat-report.md`) and would have read the wrong column even in the right file (`Result`, ending in `Evidence`, not the last-but-one column) — fixed by making `statusOf` locate its column by header name.
- Per `docs/plan.md`, UAT-01…13 must be run and recorded by the user; Claude fills in only build commit and environment, not pass/fail verdicts, to avoid grading its own acceptance tests.
- Seed data is time-relative; a day's passage moved the Samsung AC warranty from "needs action" to "recently expired," correctly exercising BR-03/BR-04 but thinning the UAT-05 dashboard view. Re-seeding was left to the user since it's destructive.
- Port 3000 is held by an untouchable stale process (`pid 400458`); API is running on 3001 with the frontend's Vite proxy (`VITE_API_TARGET`) pointed there — functionally identical for UAT.
- Git remote is still not configured; the existing CI workflow has never run and would have caught the gitignore bug on first push. Flagged as highest-value remaining action, left to the user.
- Evidence ledger (`.ai/EVIDENCE.jsonl`) lines carry no commit SHA; the writer script (`~/.claude/hooks/relay-verify.sh`) is shared across the user's other projects, so changing it was left to the user's judgment.
- Environment/tooling (outside the project): a global Claude memory note was written to `~/.claude/projects/.../memory/minimal-code-no-over-engineering.md` during this session; unrelated to Proofly.

## Project History

None identified (no prior sessions recorded distinct from this one; all commits in the git log were produced during this session).

## Testing

- [x] `node --test gates/checks.test.mjs` — 18 passed, then 22 passed after column-lookup tests were added, 0 failed
- [x] `npm run gate day1`…`day6 -- --quick` — all GATE PASSED
- [x] Fresh clone #2: `npm run build` + unit tests — build clean, 25/25 unit tests passed, health check ok
- [x] Fresh clone #3: README steps followed literally — root/api/web installs ok, migrations ok, both servers up (web 200, API health ok)
- [x] `testcases:check` / `testcases:sync` mutation proof — check caught an injected false `Fail` (exit 1); sync repaired a stale `Not run`
- [x] `npm run gate day7 -- --quick` — FAILED as expected (missing delivery docs, UAT not yet recorded); confirms the gate correctly reflects remaining work
- [ ] UAT-01…13 — pending; servers are live at `http://localhost:5173` for the user to run them

## Blockers / Risks

- [!] Port 3000 is held by a stale process (`pid 400458`) that Claude could not terminate; worked around via port 3001, but the user may want to `kill 400458` to reclaim it.
- Risk: `docs/uat-report.md` and `docs/decisions.md` are uncommitted and should be reviewed and committed.
- Risk: demo seed data has drifted by a day, so the "needs action" dashboard view is thinner than the original mockup for UAT-05; re-seeding is available but destructive and was left for the user to request.

## Exact Next Action

Write `docs/architecture.md` next, including a request-flow diagram and an ER diagram, following the structure established in `docs/decisions.md`; then continue with `docs/security.md`, `docs/demo-script.md`, and `CHANGELOG.md` to clear the "Delivery documents written" check reported by `npm run gate day7 -- --quick`.

---

## Git State

**Branch:** `master`

### Modified (unstaged)
```
 M .ai/EVIDENCE.jsonl
 M .ai/MIGRATION.md
 M docs/uat-report.md
```

### Staged
```
(none)
```

### Untracked
```
?? docs/decisions.md
```

### Unstaged diff summary
```
 .ai/EVIDENCE.jsonl |  8 ++++++++
 .ai/MIGRATION.md   | 10 +++++-----
 docs/uat-report.md | 15 +++++++++------
 3 files changed, 22 insertions(+), 11 deletions(-)
```

### Staged diff summary
```
(none)
```

### Recent commits
```
7152424 fix(gates): the UAT check was reading the wrong file and column
3709457 docs(test-cases): record NFR-12 and the two defects it found
23ede49 docs(readme): the setup the fresh-clone check proved was missing
d96d366 feat(gates): test the gate, and stop hand-writing test-case status
41f010c fix(repo): .gitignore was hiding the whole storage module
b082639 chore(gates): close Day 6
3ffb34a test(e2e): NFR-01..09 automated, and a real 44px bug fixed
223c6cf test(e2e): E2E-01..08 in a real browser
dd88e9b feat(web): search, filters, chips and paging
53c632b test(web): FE-PAGE-29..32 for search, filters and paging
```

---

<sub>Generated 2026-10-30T09:36:28Z by the PreCompact handoff hook.
Session `23bec9e4-0d33-4a49-8580-036f819117df` · trigger `auto` · cwd `/home/winstonvivek/Documents/Payment_Pal`<br>
Semantic pass: yes (model `sonnet`, 89s) · current session bounded: yes (444527 bytes -> head 6000 + tail 40000) · prior sessions included: 0 · previous handoff carried forward: no</sub>

---

<!-- handoff:compaction-record -->
## Compaction Record

Context was compacted at 2026-10-30T09:39:49Z (trigger: `auto`, session `23bec9e4-0d33-4a49-8580-036f819117df`). The summary below is what Claude Code kept in context; the sections above are what this handoff recorded independently.

```markdown
<analysis>
Let me work through this conversation chronologically. It is a very long session building a complete MVP ("Proofly") across 7 planned days, with the final messages concerning Day 7 delivery.

**Phase 1 — Orientation (first user message: "okay let's start with reading all the files design skills claudemd and all and let me know what you understand")**

I read CLAUDE.md, SKILL.md, docs/requirements.md, docs/plan.md, docs/test-plan.md, docs/test-cases.md, docs/SKILLS.md, docs/PROMPTS.md, docs/uat-report.md, design/ui-guide.md. Key facts learned:
- Proofly = purchase/receipt/warranty manager, 7-day challenge
- Locked requirements v1.0 with BR-01..BR-10, D-01..D-12 decisions
- TDD non-negotiable; stop after each slice
- Original stack: NestJS + Prisma + Vue 3 + Tailwind v4
- Gaps found: not a git repo, SKILL.md at wrong path, design/mockups/*.png missing, skills not installed

**Phase 2 — Setup (user pasted skill repo URLs "for your ref")**
I tried `npx skills add` — blocked by auto-mode classifier. I did housekeeping: git init, moved SKILL.md to .claude/skills/proofly-engineering/, created .gitignore, docs/ai-usage.md. Initial commit 89c293f.

**Phase 3 — Day 3 Slice 0 (user pasted text about treating it as go-ahead)**
Built docker-compose (port 5434 chosen because 5432/5433 taken), .env.example/.env.test.example, NestJS scaffold, env.validation.ts with fail-fast, Prisma schema + migration, setup-app.ts, e2e harness with DB guard, CI workflow, README. Commit ce206ae.

**Phase 4 — "make a system that work in phases and verify through gates"**
Built gates/phases.json + gates/run-gate.mjs with 6 check kinds (files, command, test-ids, coverage, tdd-history, testcases-status). Commit 0ecc127.

**Phase 5 — "we already have hooks cmds you can check and use"**
Found AI Migration Relay in ~/.claude/hooks/. User chose "Bind them (recommended)" via AskUserQuestion. Created .ai/MIGRATION.md via migration-state.sh --init, mapped 7 waves to 7 phases, bound `npm run gate dayN` as each wave's verification command. Commit 8355b9a.

**Phase 6 — Day 3 slices 1-5 (TDD)**
- Slice 1 DatesService: UT-DATE-01..24, 100% coverage, mutation-tested
- Slice 2 Error shape: API-ERR-01..05
- Slice 3 Auth: API-AUTH-01..12 (AUTH-12 deferred)
- Slice 4 Settings: API-SET-01..06
- Slice 5 Purchases: API-PUR-01..30

**Phase 7 — "use typeORM which is more suitable for nest.js"**
Converted Prisma→TypeORM, D-03 change logged in requirements §14. Discovered @nestjs/typeorm@12 is ESM-only, pinned to ^11. Commit 208a6b6.

**Phase 8 — User pasted NestJS org template, asked "are we following these strictly"**
I audited honestly, user chose "Org standard — align where possible". Added src/repositories/ layer, REST handler names (index/store/show/update/destroy), :purchaseId params, Swagger. Kept PATCH (contract wins over template). Commit 0d09a44.

**Phase 9 — User: "Choose option 2: move API-AUTH-12 to Day 4's gate"**
Moved it, Day 3 gate passed, wave 03 closed (needed relay-gate --clear with reason).

**Phase 10 — Day 4 (slices 1-6)**
- Receipts (API-ATT-01..14), mutation-tested magic bytes
- Service records (API-SVC-01..10)
- Cascade (API-PUR-31..32) — found files not deleted
- Dashboard (API-DASH-01..08) + AUTH-12 went green
- Search (API-SRCH-01..10)
- Seed (API-SEED-01..02)

**Phase 11 — User: "do what is best recmd"** → rendered mockups to PNG via design/render-mockups.mjs. Found blank mobile-1-dashboard.png (fixed with scrollIntoViewIfNeeded + assertion). Reading the mockup revealed dashboard API gaps.

**Phase 12 — User: "yes"** → added counts.totalValue and hasReceipt to dashboard.

**Phase 13 — Day 5 (slices 0-5)**
- Scaffold apps/web: Vite 6, Vue 3, Pinia, Vitest 3, Tailwind v4. Tokens EXTRACTED from ui-guide §2 by script + design/check-tokens.mjs
- Data layer: api/client.ts, stores/auth.ts, router guards with resolveRedirect (open-redirect protection)
- Base components: StatusBadge etc., FE-CMP-01..16
- Shell + auth pages: FE-PAGE-01..04, found logo aria-current bug
- List + form: FE-PAGE-05..12, lib/deadlines.ts (BR-01/02 ported, cross-validated against live API)
- Details: FE-PAGE-13..17, upload/download sha256 verified

**Phase 14 — Day 6 (slices 1-6)**
- Dashboard: FE-PAGE-18..21. Live check found PurchasesPage ignored URL query (card=5, list=7). Also found stale API build.
- Service dialog + deletes: FE-PAGE-22..25, extracted BaseDialog
- Settings: FE-PAGE-26..28, proved US-08 live
- Search UI: FE-PAGE-29..32
- Playwright: E2E-01..08 + NFR-01..09 automated. Found 32px logo touch target bug.

**Phase 15 — User pasted learning-order recommendation + "next"** → I gave a purchases walkthrough front-to-back.

**Phase 16 — User: "yes"** → started Day 7 fresh-clone check (NFR-12). **FOUND CRITICAL BUG**: .gitignore `storage/` matched apps/api/src/common/storage/ — module never committed, fresh clone couldn't build. Fixed in 41f010c.

**Phase 17 — User pasted improvement plan, "can we"** → I audited it against reality, found P1 authorization already done, CI never run (no remote).

**Phase 18 — User: "start"** → implemented P0-2 (gates/checks.mjs + checks.test.mjs, 18 tests) and P0-3 (gates/sync-test-cases.mjs). Commit d96d366.

**Phase 19 — User: "yes"** → fixed README gaps + docker-compose container_name. Commit 23ede49. Then found UAT gate reading wrong file/column, fixed with statusOf column-by-header, tests to 22. Commit 7152424.

**Phase 20 — User: "so whats remaning into the project"** → I reported Day 7 state.

**Phase 21 (most recent) — User: "okay do but for the uat you have to start the application backend and frontend"**
I started both servers in background (API on 3001 because stale pid 400458 holds 3000; web on 5173 with VITE_API_TARGET). Verified both. Noted demo data aged by a day (Samsung warranty expired, needsAction now 2 not 3). Filled in uat-report.md header + entry criteria with build commit 7152424.

Key security/constraint instructions from user to preserve:
- "don't over engineer and don't generate extra code keep the code minimal" (standing rule, saved to memory)
- UAT must be run by the user, not me (from plan.md)

Errors I made and fixed (important for continuation):
1. Silent no-op Python str.replace — twice. Now I assert anchors.
2. Stale build traps — twice (CSS grep against old bundle; API dist without DTO change).
3. Leading HTML comment in Vue template → fragment, no root element
4. Vitest 2 bundles own Vite (upgraded to 3)
5. vueTsConfigs.configs.recommended doesn't exist (it's vueTsConfigs.recommended)
6. nextTick vs flushPromises
7. Test date helpers mixed UTC/local vs Asia/Kolkata
8. Playwright strict-mode violations
9. Positional button selector broke when Search button added
10. drift-check purchases left in demo DB (escaping bug)
11. E2E leftovers requiring global-teardown

Current state: Day 7 gate 2 of 4. Missing: 5 delivery documents (mine), UAT-01..13 (user's).
</analysis>

<summary>

## 1. Primary Request and Intent

The user is building **Proofly** (in `~/Documents/Payment_Pal`), a purchase/receipt/warranty manager MVP, as a 7-day challenge submission judged on problem understanding, prioritisation, UI/UX, code quality, completeness, testing, and **whether the user can explain the code themselves**.

Explicit requests across the session, in order:

1. **"okay let's start with reading all the files design skills claudemd and all and let me know what you understand"** — read and summarise the project.
2. Use these skills/references: `Kadajett/agent-nestjs-skills`, `vuejs-ai/skills`, `plannotator/effective-html`, `TailGrids/tailgrids-vue`, `tailwindlabs/tailwindcss`.
3. **"make a system that work in phases and verify through gates"** — executable phase gates.
4. **"we already have hooks cmds you can check and use, they are in claude folder"** — reuse the existing AI Migration Relay. User chose **"Bind them (recommended)"**.
5. Install `nestjs-best-practices` ("if possible install this").
6. **"use typeORM which is more suitable for nest.js"** — replace Prisma.
7. Pasted a **NestJS org template guide**, asked **"are we following these strictly"**. User chose **"Org standard — align where possible"**.
8. **"Choose option 2: move API-AUTH-12 to Day 4's gate"**.
9. Use `testdino-hq/playwright-skill` for Playwright.
10. **"one more rule, don't over engineer and don't generate extra code keep the code minimal"** — standing rule, saved to memory.
11. Pasted the **awesome-claude-code-output-styles** repo: "make it claude hook or anything so we can use this anything anywhere".
12. Repeated **"next" / "proceed" / "go"** to advance through slices.
13. Pasted a **repository-learning order** recommendation (one feature front-to-back → database → tests → gates, starting with purchases).
14. Pasted a **lean improvement plan** (P0: evidence→commit SHA, test the gate runner, automatic test-case status; P1: mutation testing, authorization matrix, backup/migration; P2: reliability metrics, release report), asked **"can we"**, then **"start"**.
15. **"so whats remaning into the project"**.
16. **Most recent: "okay do but for the uat you have to start the application backend and frontend"** — write the five delivery documents, but first start both servers so the user can run UAT.

## 2. Key Technical Concepts

- **Stack**: NestJS 11 (CommonJS, TS strict) + TypeORM 0.3.31 + PostgreSQL 16 (Docker, host port **5434**) · Vue 3 `<script setup>` + Vite 6 + Pinia + Vue Router + Tailwind v4 + Vitest 3 · Playwright 1.64
- **TDD discipline**: tests from `docs/test-cases.md` written first with case IDs in test names, seen failing, then `test(` → `feat(` commit pairs
- **Business rules**: BR-01 warranty = `addMonths(start, N) − 1 day`, **clamping to month end does NOT subtract a day**; BR-02 manual deadline beats window; BR-03 inclusive (0 days left still open); BR-04 status computed per response, never stored; BR-05 SQL `DATE` only; BR-09 ownership → **404 never 403**; BR-10 uploads checked by MIME **and** magic bytes, ≤5 MB, ≤5 per purchase
- **D-10**: "today" resolved in **Asia/Kolkata** everywhere (API and browser)
- **ESM/CJS trap**: `@nestjs/typeorm@12`, `@nestjs/jwt@12`, `@nestjs/swagger@12` are all `"type": "module"` — all pinned to `^11`
- **Phase gates**: `gates/phases.json` + `gates/run-gate.mjs` + `gates/checks.mjs` (pure logic) + `gates/suites.mjs` (I/O) + `gates/checks.test.mjs` (22 tests)
- **AI Migration Relay**: `~/.claude/hooks/` — `relay-verify` records real exit codes as `tier="verified"`; only verified lines close a wave; `relay-gate --clear` retires a binding command with a stated reason

## 3. Files and Code Sections

**`gates/checks.mjs`** (new, P0-2) — the gate's decisions as pure functions so they can be tested:
```js
export function expandIds(patterns)       // "UT-DATE-01..24" → individual ids
export function matchIds(expectedIds, collected)   // → { missing, failing }
export function statusOf(markdown, ids, columnName = 'Status')  // → { absent, notRun, failed }
export function tddHistory(subjectsOldestFirst, areas)  // → { wrong, unstarted }
export function coverageFor(summary, pattern)      // → { lines, branches } | null
```
`statusOf` finds its column **by header name**, walking up to the nearest header row — because `docs/test-cases.md` ends in `Status` while `docs/uat-report.md` ends in `Evidence` and keeps its verdict in `Result`.

**`gates/checks.test.mjs`** (new) — 22 tests using built-in `node:test`, no new dependency. Each proves the gate **refuses**: a case with no test, a failing test, a `Not run` status, a missing row, an id mentioned only in prose, `feat(` before `test(`, `coverageFor` returning `null` rather than 100% for an unmatched pattern, and `purchases` not confused with `purchases-ui`.

**`gates/suites.mjs`** (new) — extracted `SUITES` + `collectTestNames` shared by the gate and the sync script.

**`gates/sy
```
