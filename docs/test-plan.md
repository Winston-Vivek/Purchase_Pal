# Proofly — Test Plan

**Version:** 1.0 · **Owner:** Winston · **Related:** `docs/requirements.md` (what), `docs/test-cases.md` (every case), `docs/uat-report.md` (acceptance)

## 1. Objective

Prove that Proofly solves the locked problem: purchases and receipts are stored safely, return and warranty dates and statuses are always correct, service history stays with the right product, and no user can see another user's data. Tests are written **before** the code (TDD), so the test cases below are also the build checklist.

## 2. Scope

**In scope:** all P0 features F-01 → F-08, P1 search/filter/sort, business rules BR-01 → BR-10, validation rules (requirements §7), API contract (§9), the screens and states in `design/ui-guide.md`, accessibility and responsive rules.

**Out of scope:** P2 items (reminders, OCR, analytics, multi-currency, deployment), load and penetration testing, browsers other than Chromium for E2E.

## 3. Test levels

| Level | What it proves | Tool | Location | Runs |
| --- | --- | --- | --- | --- |
| Unit | Date rules and status logic, in isolation | Jest | `apps/api/src/**/*.spec.ts` | Every save, CI |
| API e2e | Real HTTP through guards, pipes, filters, DB | Jest + Supertest + `proofly_test` DB | `apps/api/test/*.e2e-spec.ts` | Every slice, CI |
| Component | Vue components, stores, guards behave for the user | Vitest + Vue Test Utils | `apps/web/src/**/*.spec.ts` | Every slice, CI |
| End-to-end | Whole journeys in a browser | Playwright | `e2e/*.spec.ts` | Day 6+, before tag |
| Non-functional | Responsive, accessibility, contrast, keyboard | Manual checklist (+ Playwright viewport) | `docs/test-cases.md` §7 | Day 6, Day 7 |
| UAT | The product solves the problem for a real user | Manual | `docs/uat-report.md` | Day 7 |

## 4. TDD rules

1. Each slice starts from its test case IDs in `docs/test-cases.md`.
2. Tests are written and run first; the failing output is shown before any implementation.
3. Commit pairs: `test(<area>): <cases>` (red) then `feat(<area>): ...` (green).
4. A bug found later gets a failing test that reproduces it before the fix (Day 7 defects included).
5. A case is marked **Pass** only from a real run, with the date. Failures are recorded, not hidden.

## 5. Test data and environment

- **Fixed "today":** unit and API tests inject a clock set to **27 Oct 2026, Asia/Kolkata**, so every date in `docs/test-cases.md` is exact and repeatable.
- **Database:** `proofly_test` (Postgres 16 in docker-compose). Migrations run once per e2e run; tables are truncated between tests.
- **Users:** helper creates `a@test.dev` and `b@test.dev` (password `Passw0rd!`) per test file.
- **Files:** fixtures in `apps/api/test/fixtures/`: `receipt.pdf` (20 KB), `receipt.jpg`, `receipt.png`, `receipt.webp`, `big.pdf` (5.2 MB), `fake.pdf` (text renamed to .pdf), `malware.exe`.
- **Demo seed:** `npm run seed`. `demo@proofly.test` / `other@proofly.test`, password `demo1234`. Dates are relative to the real today so the demo always shows upcoming and expired items.

## 6. Coverage targets

| Area | Target |
| --- | --- |
| `apps/api/src/common/dates` | ≥ 90% lines and branches |
| API services overall | ≥ 80% lines |
| Every API endpoint | ≥ 1 happy path + ≥ 1 error path + ownership check where it applies |
| Every user story | ≥ 1 automated test + ≥ 1 UAT scenario (see traceability in `test-cases.md`) |

## 7. Entry and exit criteria

**Entry (per slice):** acceptance criteria exist in `docs/requirements.md`; test IDs listed in `docs/test-cases.md`.

**Exit (release):**
- All automated suites green in CI; coverage targets met
- Every case in `docs/test-cases.md` has a real result
- UAT exit criteria met (`docs/uat-report.md`)
- No open Critical or High defects

## 8. Defect management

Defects go in the log in `docs/uat-report.md` (also used before UAT).

| Severity | Meaning | Rule |
| --- | --- | --- |
| Critical | Blocks a P0 flow or leaks another user's data | Fix before anything else |
| High | Wrong date, status, amount or data saved | Fix before release |
| Medium | UX problem with a workaround | Fix if time allows, else known limitation |
| Low | Cosmetic | Log only |

## 9. Commands

```bash
docker compose up -d
cd apps/api && npm test                 # unit
cd apps/api && npm run test:cov         # unit + coverage
cd apps/api && npm run test:e2e         # API e2e
cd apps/web && npm test                 # Vitest
npx playwright test                     # E2E (API + web running)
```

## 10. Reporting

At the end of each day, update the **Status** column in `docs/test-cases.md` (Pass / Fail + defect ID + date) and paste the suite summary into the day's commit message. The final numbers go in the README and the demo.
