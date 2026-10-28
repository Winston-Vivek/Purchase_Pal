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
| 28 Oct 2026 | Day 3 / Slice 0 — Setup | `docker-compose.yml` + Postgres init script, `.env.example` / `.env.test.example`, `apps/api` scaffold (package.json, strict tsconfig, ESLint 9 flat config), `src/config/env.validation.ts`, `prisma/schema.prisma` + `init` migration, `PrismaService`/`PrismaModule`, `setup-app.ts`, `main.ts`, health endpoint, e2e harness (global-setup, test-database guard, truncate helper, `createTestApp`), `.github/workflows/ci.yml`, root `README.md`. | Ran it all: `npm run build` clean, `npm run lint` clean, `npm run test:e2e` 4/4 pass. Read the generated `migration.sql` and confirmed `DATE` columns, `DECIMAL(12,2)`, all four §10 indexes and `ON DELETE CASCADE` on every FK. Proved the config fails fast by booting with a short `JWT_SECRET`, a missing `DATABASE_URL` and a bad `APP_TIMEZONE` — each refused with a named error. Proved the e2e guard by pointing it at the dev database: it refused before migrating. Started the API and got `{"status":"ok","database":"up"}` from `/api/v1/health`. |
