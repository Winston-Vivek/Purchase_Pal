# Proofly — AI usage log

Every change written with Claude Code, and **how I verified it**. One line per slice, added at the
end of that slice (`.claude/skills/proofly-engineering/SKILL.md` §7).

Why this file exists: the challenge is judged partly on how well I understand my own code. This log
is the audit trail — it records what was generated, what I changed afterwards, and the real command
I ran to check it.

**Columns**
- *Date* — the day the work landed.
- *Slice* — the slice ID from `docs/plan.md` (e.g. `Day 3 / Slice 1 — DatesService`).
- *What Claude wrote* — files and the gist of the change.
- *How I verified it* — the actual command and its result, or the review I did. Never "looks fine".

| Date | Slice | What Claude wrote | How I verified it |
| --- | --- | --- | --- |
| 28 Oct 2026 | Tooling — relay binding | Activated the existing AI Migration Relay for this repo: `.ai/MIGRATION.md` created with `migration-state.sh --init` (never by hand), seven waves mapped 1:1 onto the seven phases in `docs/plan.md`, each wave's binding command set to `npm run gate dayN`. Added root `test`/`test:e2e`/`lint`/`db:up` scripts, which also clears the detector's `no-test-script` signal. | `relay-check` reports READY (5/5 hooks, 16/16 scripts). Verified waves 01 and 02 through `relay-verify -- npm run gate dayN`: both recorded VERIFIED PASS (exit 0). Recorded the API e2e suite with `--metric tests=` — baseline 4. Ran Day 3's gate through the relay and it recorded VERIFIED FAIL (exit 1), which correctly holds wave 03 open; `relay-gate` shows 01/02 VERIFIED and 03 failing by name. Machine `relay:*` regions left untouched. |
| 28 Oct 2026 | Tooling — phase gates | `gates/phases.json` (7 phases, 24 slices, 25 checks), `gates/run-gate.mjs` (six check kinds incl. `test-ids`, `tdd-history`, `testcases-status`), `gates/README.md`, root `package.json` with `gate`/`gate:status`, a regression step in CI, and links from `README.md` and `docs/plan.md`. | Ran every mode: `--status` renders the board; `day1` and `day2` both PASS; `day3` correctly FAILS with 4 of 6 checks, naming all 77 unwritten cases, the missing coverage, the absent TDD commits and the untouched status column; `--ci` re-runs the two passed phases green. Verified the failure is real, not cosmetic — exit code 1. |
| 28 Oct 2026 | Day 3 / Slice 0 — Setup | `docker-compose.yml` + Postgres init script, `.env.example` / `.env.test.example`, `apps/api` scaffold (package.json, strict tsconfig, ESLint 9 flat config), `src/config/env.validation.ts`, `prisma/schema.prisma` + `init` migration, `PrismaService`/`PrismaModule`, `setup-app.ts`, `main.ts`, health endpoint, e2e harness (global-setup, test-database guard, truncate helper, `createTestApp`), `.github/workflows/ci.yml`, root `README.md`. | Ran it all: `npm run build` clean, `npm run lint` clean, `npm run test:e2e` 4/4 pass. Read the generated `migration.sql` and confirmed `DATE` columns, `DECIMAL(12,2)`, all four §10 indexes and `ON DELETE CASCADE` on every FK. Proved the config fails fast by booting with a short `JWT_SECRET`, a missing `DATABASE_URL` and a bad `APP_TIMEZONE` — each refused with a named error. Proved the e2e guard by pointing it at the dev database: it refused before migrating. Started the API and got `{"status":"ok","database":"up"}` from `/api/v1/health`. |
