# Proofly

**Every receipt, return and warranty in one place.**

People lose purchase receipts, forget return deadlines and warranty expiry dates, and keep no record
of repairs. When a product fails they cannot find the invoice or tell whether they are still covered.
Proofly is one place where a signed-in user records each purchase, attaches its receipt, sees return
and warranty status at a glance, logs service history, and finds any product in seconds.

> **Status: in development.** The backend scaffold is up (Day 3, Slice 0 of 7).
> See [`docs/plan.md`](docs/plan.md) for the day-by-day plan and what is built so far.

---

## Setup

**You need:** Node.js 20+, npm, and Docker.

```bash
# 1. Configuration
cp .env.example .env
cp .env.test.example .env.test

# Put a real secret in .env — the API refuses to start without one.
# On macOS/Linux:
sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -base64 48)|" .env

# 2. Database (Postgres 16, creates both `proofly` and `proofly_test`)
docker compose up -d --wait

# 3. API
cd apps/api
npm install
npm run migration:run       # applies migrations to the dev database
npm run start:dev           # http://localhost:3000/api/v1
```

Check it is alive:

```bash
curl http://localhost:3000/api/v1/health
# {"status":"ok","database":"up"}
```

Interactive API documentation is at **http://localhost:3000/api/docs**, generated from
the DTOs so it cannot drift from what the API actually accepts. It is not mounted when
`NODE_ENV=production`.

### A note on the database port

The container publishes Postgres on **5434**, not the usual 5432, because 5432 and 5433 are
frequently already taken by another Postgres on a development machine. Nothing in the code depends
on the number — it only appears in `DATABASE_URL`.

---

## Commands

Run from `apps/api` unless noted.

| Command | What it does |
| --- | --- |
| `docker compose up -d --wait` | Start Postgres (from the repo root) |
| `docker compose down` | Stop it, keeping data |
| `docker compose down -v` | Stop it and wipe the data volume |
| `npm run start:dev` | API with hot reload |
| `npm run build` | Compile to `dist/` |
| `npm run lint` / `npm run lint:fix` | ESLint |
| `npm test` | Unit tests (Jest) |
| `npm run test:cov` | Unit tests with coverage |
| `npm run test:e2e` | API e2e tests (Supertest, against `proofly_test`) |
| `npm run migration:generate -- src/database/migrations/<Name>` | Generate a migration from entity changes |
| `npm run migration:run` | Apply pending migrations |
| `npm run migration:revert` | Roll the last migration back |
| `npm run migration:show` | List applied and pending migrations |

The e2e suite migrates `proofly_test` itself and truncates every table between tests, so it needs no
setup beyond `docker compose up -d`. It refuses to run against any database whose name does not
contain `proofly_test`.

---

## Phase gates

The build runs in seven phases, and each one ends in a gate that is checked by a script rather than
by eye:

```bash
npm run gate:status        # the board: phases, slices, test cases each owns
npm run gate day3          # run Day 3's gate
npm run gate -- --ci       # re-run every phase already signed off
```

A gate fails if a test case ID from `docs/test-cases.md` has no test, if a test is failing, if
coverage is short, if `docs/test-cases.md` still says "Not run" — or if the first commit for an area
was `feat(` rather than `test(`, which is what writing code before its failing test looks like in the
history. See [`gates/README.md`](gates/README.md).

---

## How it is built

| Layer | Choice |
| --- | --- |
| API | NestJS 11, TypeScript strict, class-validator DTOs, global `ValidationPipe` |
| Database | PostgreSQL 16 + TypeORM, migrations only |
| Auth | bcrypt + JWT in an httpOnly, SameSite=Lax cookie |
| Web | Vue 3 (`<script setup lang="ts">`), Vite, Pinia, Vue Router, Tailwind CSS v4 *(from Day 5)* |
| Tests | Jest + Supertest, Vitest + Vue Test Utils, Playwright |

Two decisions shape most of the code:

- **Business dates are SQL `DATE`, and status is computed per response, never stored.** A deadline is
  a calendar day, and "expiring soon" depends on the user's own alert window, so a stored status
  would be stale by morning. All date maths lives in one place, `apps/api/src/common/dates`.
- **Every query is scoped to the signed-in user, and another user's record returns 404, not 403** —
  so the API never reveals that someone else's purchase exists.

---

## Repository layout

```
apps/api/      NestJS API — src/<feature>/, src/common/, src/repositories/, src/database/, test/
apps/web/      Vue app (from Day 5)
e2e/           Playwright journeys (from Day 6)
docs/          requirements, plan, test plan, test cases, UAT, AI usage
design/        UI guide, wireframes, colour mockups
docker/        Postgres init scripts
```

## Documentation

| Document | What is in it |
| --- | --- |
| [`docs/requirements.md`](docs/requirements.md) | **Locked v1.0** — scope, business rules BR-01…10, validation, user stories, API contract, data model |
| [`docs/plan.md`](docs/plan.md) | The 7-day plan, one gate per day |
| [`docs/test-plan.md`](docs/test-plan.md) | Test levels, tools, fixtures, fixed clock, coverage targets |
| [`docs/test-cases.md`](docs/test-cases.md) | Every test case with exact inputs and expected results |
| [`docs/uat-report.md`](docs/uat-report.md) | UAT scenarios and the defect log |
| [`docs/ai-usage.md`](docs/ai-usage.md) | What was written with AI assistance, and how each change was verified |
| [`design/ui-guide.md`](design/ui-guide.md) | Design tokens, status system, components, screens, accessibility |

## Testing approach

Tests come from [`docs/test-cases.md`](docs/test-cases.md) and are written **before** the code, each
one carrying its case ID in the test name. The commit history shows the pairs: `test(...)` with the
failing run, then `feat(...)` with it passing.

## Licence

Unlicensed — built as a challenge submission.
