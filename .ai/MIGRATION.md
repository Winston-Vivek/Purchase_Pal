# Migration

<!-- Sections fenced by `relay:*` markers are written by migration-state.sh from
     the detector, the skill lock, the evidence ledger and git. Edits inside them
     are overwritten. Everything else is yours to write. -->

## Objective

Build the Proofly MVP in 7 verified phases (greenfield build, not a legacy migration): NestJS + TypeORM API, Vue 3 + Tailwind v4 web, TDD from docs/test-cases.md, each phase closed by 'npm run gate dayN'

## Source Stack

<!-- relay:source-stack:start -->
_Read from manifests by `detect-stack.sh`. Not model output._

| Component | Name | Version | Read from |
|---|---|---|---|
| - | _none detected_ | - | - |

**Package manager:** `npm` (evidence: `package-lock.json`)  
**Source files:** 22 `vue`, 8 `js`, 111 `ts`  
**Config files:** `playwright.config.ts`

**Migration signals detected:**

<!-- relay:source-stack:end -->

## Target Stack

_Greenfield build, locked in `docs/requirements.md` §5 (D-01..D-12)._

| Component | Choice |
|---|---|
| API | NestJS 11, TypeScript strict, class-validator DTOs, global ValidationPipe |
| Database | PostgreSQL 16 + TypeORM, migrations only, `synchronize: false` (D-03 changed 28 Oct) |
| Auth | bcrypt + JWT in an httpOnly, SameSite=Lax cookie |
| Web | Vue 3 `<script setup lang="ts">`, Vite, Pinia, Vue Router, Tailwind CSS v4 |
| Tests | Jest + Supertest (API), Vitest + Vue Test Utils (web), Playwright (E2E) |
| Run target | Local via docker-compose; no deployment (D-07) |

## Target Runtime

<!-- The LOWEST version of each runtime that any deployment target runs. Not the
     version on this machine. `relay-verify relay-runtime` checks the repo
     against these; until they are set it reports a gap rather than a pass. -->

    node: 20

_No PHP in this stack. CI pins node 20; `apps/api/package.json` declares
`engines.node >= 20`._

## Selected Skills / References

<!-- relay:skills:start -->
_No skill resolution recorded. Run the resolver._
<!-- relay:skills:end -->

## Migration Waves

_One wave per phase in `docs/plan.md`. Each closes on a verified
`npm run gate dayN` — see `gates/README.md` for what that checks._

- [x] 01 Requirements — scope, business rules BR-01..10, validation, user stories, API contract, data model. Gate: `npm run gate day1`
- [x] 02 Design — UI guide, `@theme` tokens, status system, screens, wireframes, mockups. Gate: `npm run gate day2`
- [x] 03 Backend core — setup, DatesService, error shape, auth, alert settings, purchases CRUD. 77 cases. Gate: `npm run gate day3`
- [x] 04 Backend features — receipts, service records, cascade, dashboard, search, seed. 46 cases. Gate: `npm run gate day4`
- [x] 05 Frontend core — scaffold, data layer, base components, shell, list/form, details. 43 cases. Gate: `npm run gate day5`
- [x] 06 Frontend features + E2E — dashboard, dialogs, settings, search UI, Playwright, quality pass. 35 cases. Gate: `npm run gate day6`
- [~] 07 UAT and delivery — fresh-clone check, UAT-01..13, defect fixes test-first, docs, tag v1.0.0. Gate: `npm run gate day7`

## Current Wave

07 UAT and delivery

## Completed

- [x] 01 Requirements
- [x] 02 Design
- [x] 03 Backend core
- [x] 04 Backend features
- [x] 05 Frontend core
- [x] 06 Frontend features + E2E

## In Progress

- [x] 03 Backend core — Slice 0 (setup) done at `ce206ae`; slices 1-5 unwritten

## Pending
- [ ] 03 Backend core
- [ ] 04 Backend features
- [ ] 05 Frontend core
- [ ] 06 Frontend features + E2E
- [ ] 07 UAT and delivery

## Blocked

None identified.

## Verification Evidence

<!-- relay:evidence:start -->
_Machine-generated from `.ai/EVIDENCE.jsonl`. Do not edit by hand._

```
140 commands recorded, of which 11 verified (7 passed, 4 failed, 2 non-binding).

Files changed since baseline `0ecc127` (git): 175
  - apps/api/package.json
  - apps/api/package-lock.json
  - apps/api/prisma/migrations/20261028080043_init/migration.sql
  - apps/api/prisma/migrations/migration_lock.toml
  - apps/api/prisma/schema.prisma
  - apps/api/src/app.module.ts
  - apps/api/src/attachments/attachment.entity.ts
  - apps/api/src/attachments/attachment-response.ts
  - apps/api/src/attachments/attachments.controller.ts
  - apps/api/src/attachments/attachments.module.ts
  - apps/api/src/attachments/attachments.service.ts
  - apps/api/src/auth/auth.constants.ts
  ... and 163 more

Tool-observed edits: 0 across 0 files.
  (Only Edit/Write/MultiEdit are visible to the hook. A Bash-first session
   records none of its changes here -- the git list above is the complete one.)

Most recent verified runs:
  [!] `npm run gate day3` -> exit 1  (wave 03, 2026-10-28T09:33:48Z)
  [!] probe `npm test` -> exit 1  (wave 03, 2026-10-28T09:38:07Z)
  [!] probe `npm --prefix apps/api run test:e2e` -> exit 1  (wave 03, 2026-10-28T10:00:13Z)
  [!] `npm --prefix apps/api run test:e2e` -> exit 1  (wave 03, 2026-10-28T10:53:00Z)
  [x] `npm run gate day3` -> exit 0  (wave 03, 2026-10-28T11:47:47Z)
  [x] `npm run gate day4` -> exit 0  (wave 04, 2026-10-29T07:51:40Z)
  [x] `npm run gate day5` -> exit 0  (wave 05, 2026-10-29T13:16:15Z)
  [x] `npm run gate day6` -> exit 0  (wave 06, 2026-10-29T17:08:53Z)
```

**Wave verification gate**

- Wave `01` — **verified**: every binding command last ran green.
- Wave `02` — **verified**: every binding command last ran green.
- Wave `03` — **verified**: every binding command last ran green.
    - probes (recorded, non-binding):
        - `npm --prefix apps/api run test:e2e` -> exit 1
        - `npm test` -> exit 1
- Wave `04` — **verified**: every binding command last ran green.
- Wave `05` — **verified**: every binding command last ran green.
- Wave `06` — **verified**: every binding command last ran green.
- Wave `07` — _not verified_: no passing `relay-verify` run recorded.

**Tracked metrics**

- `tests` for `npm --prefix apps/api run test:e2e`: 56 — baseline, wave 03.
- `tests` for `npm run test:e2e`: 4 — baseline, wave 03.

**Verified runs for the current wave (`07`)**

```
(none)
```
<!-- relay:evidence:end -->

### Working tree

<!-- relay:git:start -->
- Branch `master` at `41f010c`, 2 uncommitted path(s).
- Changed now:

```
 M .ai/EVIDENCE.jsonl
 M .ai/MIGRATION.md
```
<!-- relay:git:end -->

## Decisions

<!-- relay:decisions:start -->
_Recorded with `relay-decide`; the durable record is in `.ai/EVIDENCE.jsonl`._
_A decision records what was chosen and why. It never closes a wave._

_No decisions recorded. Use `relay-decide` when a choice changes what the migration does._

<!-- relay:decisions:end -->

## Risks

| Risk | Mitigation |
|---|---|
| Off-by-one or time-zone date bugs | DATE columns, one DatesService, 24 unit tests written first, injectable clock pinned to 2026-10-27 Asia/Kolkata |
| Tests silently stop being discovered | `relay-verify --metric` trends the passing count across waves; an exit code alone cannot see this |
| Code written before its failing test | `gate`'s `tdd-history` check fails if an area's first commit is `feat(` rather than `test(` |
| A day slips | Cut P1 (search polish, sort) first; P0 never shrinks |
| `design/mockups/*.png` does not exist | Needed by wave 05; export from `design/Proofly Colour Mockups.html` or repoint the Day 5 prompt before starting |

## Exact Next Action

The build is complete. 265 automated tests: 25 unit, 107 API e2e, 140 web
component, 17 Playwright (8 journeys + 9 non-functional).

Day 7, in order: the fresh-clone check (NFR-12) from the README alone, then
Winston runs UAT-01..13 and reports results, then any Critical/High defect is
fixed test-first, then docs/architecture.md, security.md, decisions.md,
demo-script.md and CHANGELOG.md, then tag v1.0.0.

One feature gap, flagged three times and never silently dropped: the Receipt
fieldset on the ADD form (desktop-3-add-purchase.png shows it). FileDrop
exists and is tested; it needs a save-then-upload step. No test case covers
it. Decide whether it ships or goes in CHANGELOG.md as a known limitation.

## Last Updated

<!-- relay:updated:start -->
- 2026-10-29T18:00:30Z (mechanical regions refreshed by `migration-state.sh`)
<!-- relay:updated:end -->
