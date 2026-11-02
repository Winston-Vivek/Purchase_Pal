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
**Source files:** 27 `vue`, 12 `js`, 158 `ts`  
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
| Run target | Vercel (web) + Render container (API) + Neon Postgres; docker-compose locally. D-07 changed 2 Nov 2026 |

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

- [~] Deployment, phases 4 and 5 of `docs/runbook-deployment.md` — all code and configuration is written and verified locally; what remains is dashboard work on Render and Vercel, which needs the account holder
- [~] CI's first run is unconfirmed — the GitHub mirror exists and the workflow can fire, but no run has been observed passing (no `gh` CLI on this machine to read it)

## Pending

- [ ] Render: create the service from `render.yaml` (Blueprint), set the five `sync: false` values
- [ ] Vercel: deploy `apps/web`, then correct `vercel.json`'s rewrite if Render assigned a name other than `purchase-tracker-api`
- [ ] Set `WEB_ORIGIN` and `APP_URL` on Render to the Vercel domain once it exists — until then the browser cannot use the API
- [ ] Add `API_BASE_URL` and `CRON_SECRET` as GitHub repository secrets, then run *Daily reminders* by hand once
- [ ] Phase 6 smoke test against the live pair
- [ ] Confirm CI's first run passed

## Blocked

None identified.

## Verification Evidence

<!-- relay:evidence:start -->
_Machine-generated from `.ai/EVIDENCE.jsonl`. Do not edit by hand._

```
411 commands recorded, of which 11 verified (7 passed, 4 failed, 2 non-binding).

Files changed since baseline `0ecc127` (git): 252
  - apps/api/Dockerfile
  - apps/api/.dockerignore
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
  ... and 240 more

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
- Branch `master` at `3ac49de`, 3 uncommitted path(s).
- Changed now:

```
 M .ai/EVIDENCE.jsonl
 M .ai/MIGRATION.md
 M .env.example
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
| Migrations run from the container's `CMD`, not a platform pre-deploy step | Pre-deploy commands are a paid Render feature; on `free` the schema would never be applied |
| Ephemeral receipt storage accepted in production | A free instance cannot attach a disk. Chosen over \$7/month or an object-storage adapter because the deployment is a demonstration; recorded against BR-10 |
| BR-16's digest scheduled by GitHub Actions | Vercel cron sends GET with no custom headers and only invokes Vercel Functions; Render cron is paid-only. The endpoint is POST behind `x-cron-secret` |
| `DATABASE_SSL` parsed with `=== 'true'`, not `@Type(() => Boolean)` | `Boolean('false')` is `true`, so the declarative form turned the `.env.example` default into SSL being demanded from a local Postgres |

<!-- relay:decisions:start -->
_Recorded with `relay-decide`; the durable record is in `.ai/EVIDENCE.jsonl`._
_A decision records what was chosen and why. It never closes a wave._

_No decisions recorded. Use `relay-decide` when a choice changes what the migration does._

<!-- relay:decisions:end -->

## Risks

| Risk | Mitigation |
|---|---|
| CI has still never been observed passing | The GitHub mirror now exists, so the workflow can run — but nobody has read the result. No `gh` CLI here; it needs a look at the Actions tab |
| Demo seed data is date-relative and ages with the calendar | Dashboard counts shifted between the 29th and 30th seeding; re-seed before UAT if a fixed scenario set is needed. **The seed must never run in production** — it creates an account whose password is published in this repository |
| Receipts do not survive a restart in production | Free Render instances cannot attach a disk. Accepted and recorded in `CHANGELOG.md` against BR-10; the two fixes (paid plan, or an adapter behind `STORAGE`) are both ready to take |
| A failed migration now takes the API down rather than cancelling the release | Pre-deploy commands are paid-only, so migrations run from the container's `CMD`. Noted in both `render.yaml` and the Dockerfile with how to move it back |
| `vercel.json`'s rewrite hard-codes `purchase-tracker-api.onrender.com` | Render may assign a different hostname; if it does, every API call 404s until the rewrite is corrected |
| The reminders workflow is disabled after 60 days without a commit | A GitHub scheduled workflow is paused on an idle repository. First thing to check if the digest stops arriving |
| Receipt-upload step on the Add Purchase form is covered by no test case | Recorded as a known limitation in `CHANGELOG.md` |

## Exact Next Action

Push `master` to the GitHub mirror, then create the Render service from the
`render.yaml` blueprint and deploy `apps/web` to Vercel. Both are dashboard
steps that need the account holder; everything they depend on is committed and
has been verified against a real container.

After the Vercel domain exists, set `WEB_ORIGIN` and `APP_URL` on Render to it
— the API will not serve the browser correctly until that is done.

## Last Updated

<!-- relay:updated:start -->
- 2026-11-02T13:39:40Z (mechanical regions refreshed by `migration-state.sh`)
<!-- relay:updated:end -->
