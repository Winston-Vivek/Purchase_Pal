# Proofly — instructions for Claude Code

Proofly is a purchase, receipt and warranty manager MVP, built in 7 days for a challenge judged on problem understanding, prioritisation, UI/UX, code quality, completeness, testing, and the developer's understanding of the code.

## Read first

| File | Role |
| --- | --- |
| `docs/requirements.md` | LOCKED: scope, business rules BR-01..10, validation, stories, API contract, data model |
| `docs/plan.md` | Day-by-day slices, gates, which test IDs each slice must pass |
| `docs/test-cases.md` | Every test case with exact inputs and expected results (write these first) |
| `docs/test-plan.md` | Test levels, tools, fixtures, fixed clock, coverage targets |
| `design/ui-guide.md` + `design/mockups/` | Locked UI: tokens, components, screens, states, accessibility |
| `.claude/skills/proofly-engineering/SKILL.md` | Combined working rules (NestJS, Vue, Tailwind v4, TailGrids, effective-html, UI UX Pro Max) |

## Stack (locked)

NestJS 11 + TypeScript strict · PostgreSQL 16 + TypeORM · bcrypt + JWT in httpOnly cookie · Vue 3 `<script setup lang="ts">` + Vite + Pinia + Vue Router · Tailwind CSS v4 · Jest + Supertest · Vitest + Vue Test Utils · Playwright · docker-compose for Postgres.

## Non-negotiables

1. **TDD:** tests from `docs/test-cases.md` are written and seen failing before any implementation. Commit `test:` (red) then `feat:` (green).
2. **Stop after each slice** with a real test summary and wait for "next".
3. **Never** change P0 scope, business rules or the API contract without asking; log approved changes in the requirements change log.
4. **Never** mark a test passed without running it.
5. Every query is scoped to the signed-in user; other users' records return **404**.
6. All date maths in `apps/api/src/common/dates` with an injectable clock; tests use today = 2026-10-27 (Asia/Kolkata).
7. One error shape: `{ "error": { "code", "message", "fields"? } }`.
8. Frontend uses only the `@theme` tokens from the UI guide; every status = icon + text + colour.

## Layout

```
apps/api/      NestJS (src/<feature>/, src/common/, src/repositories/, src/database/, test/)
apps/web/      Vue (src/pages, components, composables, stores, api)
e2e/           Playwright
docs/          requirements, plan, test-plan, test-cases, uat-report, SKILLS, PROMPTS, + architecture, decisions, security, ai-usage, demo-script
design/        ui-guide, wireframes, mockups
```

## Commands (update as scripts are added)

```bash
docker compose up -d
cd apps/api && npm test && npm run test:e2e
cd apps/web && npm test
npx playwright test
```
