# Migration

<!-- Sections fenced by `relay:*` markers are written by migration-state.sh from
     the detector, the skill lock, the evidence ledger and git. Edits inside them
     are overwritten. Everything else is yours to write. -->

## Objective

Build the Proofly MVP in 7 verified phases (greenfield build, not a legacy migration): NestJS + TypeORM API, Vue 3 + Tailwind v4 web, TDD from docs/test-cases.md, each phase closed by `npm run gate dayN`.

## Source Stack

<!-- relay:source-stack:start -->
_Read from manifests by `detect-stack.sh`. Not model output._

| Component | Name | Version | Read from |
|---|---|---|---|
| - | _none detected_ | - | - |

**Package manager:** `npm` (evidence: `package-lock.json`)  
**Source files:** 27 `vue`, 12 `js`, 152 `ts`  
**Config files:** `playwright.config.ts`

**Migration signals detected:**

<!-- relay:source-stack:end -->

## Target Stack

| Component | Choice |
|---|---|
| API | NestJS 11, TypeScript strict, class-validator DTOs, global ValidationPipe |
| Database | PostgreSQL 16 + TypeORM, migrations only, `synchronize: false` (D-03 changed from Prisma to TypeORM on Day 3, to match the TypeORM-specific `nestjs-best-practices` skill) |
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

- [x] 01 Requirements
- [x] 02 Design
- [x] 03 Backend core
- [x] 04 Backend features
- [x] 05 Frontend core
- [x] 06 Frontend features + E2E
- [~] 07 UAT and delivery — last recorded `npm run gate day7` run failed (missing delivery docs, 13 unrecorded UAT scenarios); no verified passing run exists for this wave

## Current Wave

07 UAT and delivery

## Completed

- [x] 01 Requirements
- [x] 02 Design
- [x] 03 Backend core
- [x] 04 Backend features
- [x] 05 Frontend core
- [x] 06 Frontend features + E2E
- [x] Fresh-clone defect fixed: `.gitignore`'s bare `storage/` had excluded `apps/api/src/common/storage/` from version control, re-verified from two further clean clones (commit `41f010c`)
- [x] README setup corrected for a fresh clone and `docker-compose.yml`'s `container_name` clash removed (commit `23ede49`)
- [x] Gate decision logic extracted to `gates/checks.mjs` with its own test suite (`gates/checks.test.mjs`) and imported by `run-gate.mjs` (commit `d96d366`)
- [x] `docs/test-cases.md` status column generated from suite results via `npm run testcases:sync`/`testcases:check` rather than hand-maintained (commit `d96d366`)
- [x] Day 7 gate's UAT check fixed to read `docs/uat-report.md`'s `Result` column instead of `docs/test-cases.md` (commit `7152424`)
- [x] NFR-12 (fresh clone) recorded Pass in `docs/test-cases.md`

## In Progress

- [~] Day 7 delivery documents — `docs/decisions.md` drafted (untracked, uncommitted); `docs/architecture.md`, `docs/security.md`, `docs/demo-script.md`, `CHANGELOG.md` not yet started
- [~] `docs/uat-report.md` prepared with build/environment/account details (modified, uncommitted); UAT-01..13 rows not yet filled in
- [~] `HANDOFF.md` present in the working tree (untracked); its contents are not established from the session data

## Pending

- [ ] UAT-01..13 run against the app and results recorded
- [ ] Any Critical/High defect found by UAT fixed test-first
- [ ] `v1.0.0` tag
- [ ] Decide whether the Receipt-upload step on the Add Purchase form ships or is recorded in `CHANGELOG.md` as a known limitation
- [ ] Git remote configured so the existing CI workflow runs for the first time

## Blocked

None identified.

## Verification Evidence

<!-- relay:evidence:start -->
_Machine-generated from `.ai/EVIDENCE.jsonl`. Do not edit by hand._

```
358 commands recorded, of which 11 verified (7 passed, 4 failed, 2 non-binding).

Files changed since baseline `0ecc127` (git): 239
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
  ... and 227 more

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
- Branch `master` at `419f424`, 2 uncommitted path(s).
- Changed now:

```
 M .ai/EVIDENCE.jsonl
 M .ai/MIGRATION.md
```
<!-- relay:git:end -->

## Decisions

| Decision | Reason |
|---|---|
| D-03 changed: Prisma → TypeORM (Day 3) | The `nestjs-best-practices` skill the project is built against is TypeORM-specific |
| Gate logic moved to `gates/checks.mjs`, `run-gate.mjs` imports it | Tests against a duplicate of the gate's logic would prove nothing about the gate that actually runs |
| `docs/test-cases.md` status column generated by `testcases:sync`, not hand-written | A hand-maintained status column is where a wrong entry is indistinguishable from a right one |
| `testcases:check`/`sync` wired into CI but not into the phase gates | A gate running its own tests as one of its checks is circular |
| `statusOf` locates its column by header name, not by position | `docs/test-cases.md` ends in `Status`; `docs/uat-report.md` ends in `Evidence` and keeps its verdict in `Result` — counting from the end read the wrong cell |
| `.gitignore`'s storage exclusion re-anchored to `var/` | The bare `storage/` pattern also matched `apps/api/src/common/storage/`, excluding the module from the repo with no warning from git |

<!-- relay:decisions:start -->
_Recorded with `relay-decide`; the durable record is in `.ai/EVIDENCE.jsonl`._
_A decision records what was chosen and why. It never closes a wave._

_No decisions recorded. Use `relay-decide` when a choice changes what the migration does._

<!-- relay:decisions:end -->

## Risks

| Risk | Mitigation |
|---|---|
| No git remote configured; the existing CI workflow has never run | The fresh-clone bug that broke the build would have been caught by `checkout` → `npm ci` → `build` on first push — setting up the remote is unresolved |
| Demo seed data is date-relative and ages with the calendar | Dashboard counts shifted between the 29th and 30th seeding; re-seed before UAT if a fixed scenario set is needed |
| Five Day 7 delivery documents and all 13 UAT results are unrecorded | The last `npm run gate day7` run failed on exactly these two checks |
| Receipt-upload step on the Add Purchase form is covered by no test case | Undecided whether it ships or is logged as a known limitation before `v1.0.0` |

## Exact Next Action

Write `docs/architecture.md` (request-flow and ER diagrams) to close one of the five missing Day 7 delivery documents, commit it, then run `npm run gate day7 -- --quick` to confirm the "Delivery documents written" check moves toward passing.

## Last Updated

<!-- relay:updated:start -->
- 2026-11-02T12:00:09Z (mechanical regions refreshed by `migration-state.sh`)
<!-- relay:updated:end -->
