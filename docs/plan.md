# Proofly — Delivery Plan: Requirement to UAT (7 days)

**Owner:** Winston · **Coding partner:** Claude (Claude Code in the terminal) · **Start:** Day 1 = 27 Oct 2026
**Method:** step by step, one gate per day, test-driven development (TDD) from Day 3.

---

## 1. Where we are

| Step | Day | Status | Output in the repo |
| --- | --- | --- | --- |
| 1. Requirement lock | 1 | ✅ Done | `docs/requirements.md` (v1.0, locked) |
| 2. UI/UX design guide and screens | 2 | ✅ Done | `design/ui-guide.md`, `design/wireframes.html`, `design/mockups/` |
| 3. Setup + backend core (TDD) | 3 | ⏳ Next | NestJS API: auth, settings, purchases, date rules |
| 4. Backend features (TDD) | 4 | — | Receipts, service records, dashboard, search, seed data |
| 5. Frontend core (TDD) | 5 | — | Vue app shell, auth, list, form, details |
| 6. Frontend features + E2E | 6 | — | Dashboard, service dialog, settings, Playwright |
| 7. UAT + delivery | 7 | — | UAT report, docs, demo, v1.0.0 tag |

The challenge asks for a working MVP (frontend + backend), source code with a README, relevant tests, a final demo, and all possible documentation. Evaluation covers problem understanding, prioritisation, UI/UX, code quality, completeness, testing, and how well you understand your own code.

---

## 2. Locked decisions (from `docs/requirements.md`)

| Area | Decision |
| --- | --- |
| Frontend | Vue 3 (Composition API, `<script setup lang="ts">`), Vite, Pinia, Vue Router |
| Styling | Tailwind CSS v4 (`@theme` tokens from `design/ui-guide.md`), TailGrids Vue markup patterns ported to v4 |
| Backend | NestJS 11, TypeScript strict, class-validator DTOs, global ValidationPipe |
| Database | PostgreSQL 16 + Prisma, migrations only |
| Auth | bcrypt + JWT in an httpOnly, SameSite=Lax cookie |
| Tests | Jest + Supertest (API), Vitest + Vue Test Utils (UI), Playwright (E2E) |
| Run target | Local via docker-compose; no deployment |
| Design | Dashboard direction A, Purchase details direction A, light mode only (dark = P2) |
| Alerts | User-configurable windows; defaults 30 days (warranty), 7 days (return) |
| Warranty end | Start + N months − 1 day (inclusive); clamp to month end when the day doesn't exist |
| Time zone | "Today" in Asia/Kolkata (`APP_TIMEZONE`) |

---

## 3. Skills and references

Full install steps: `docs/SKILLS.md`. Combined working rules: `.claude/skills/proofly-engineering/SKILL.md`.

| Source | Type | Used in |
| --- | --- | --- |
| [Kadajett/agent-nestjs-skills](https://github.com/Kadajett/agent-nestjs-skills) | Skill: `nestjs-best-practices` | Days 3–4, every backend slice |
| [vuejs-ai/skills](https://github.com/vuejs-ai/skills) | Skills: `vue-best-practices`, `vue-router-*`, `vue-pinia-*`, `vue-testing-*` | Days 5–6, every frontend slice |
| [plannotator/effective-html](https://github.com/plannotator/effective-html) | Skills: `html-wireframe`, `html-prototype`, `html-diagram` | Day 2 wireframes (done), Day 7 architecture diagrams |
| [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | Skill: UX rules + pre-delivery checklist | Day 2 (done), Day 6 UI review |
| [TailGrids/tailgrids-vue](https://github.com/TailGrids/tailgrids-vue) | Reference (archived, Tailwind v3) | Days 5–6, component markup patterns |
| [tailwindlabs/tailwindcss](https://github.com/tailwindlabs/tailwindcss) | Reference (Tailwind v4) | Days 5–6, tokens and responsive layout |

---

## 4. How every build day runs

**The gates below are executable.** `gates/phases.json` holds this plan in machine-readable form and
`npm run gate <phase>` checks it: test case IDs that have no test, failing tests, short coverage,
cases still marked "Not run", and areas whose first commit was `feat(` instead of `test(`. See
[`gates/README.md`](../gates/README.md).

### TDD loop (each slice)

1. **Red:** Claude writes the tests for the slice's test cases (IDs in `docs/test-cases.md`) and runs them. They must fail for the right reason. Commit `test(<area>): ...`.
2. **Green:** minimum code to pass. Run the slice's tests and the full suite. Commit `feat(<area>): ...`.
3. **Refactor:** clean up against the skill rules with the tests still green. Commit `refactor(<area>): ...` if anything changed.
4. **Review:** you read the diff, run the tests yourself, and say "next". Nothing moves on without your approval.

### Daily rhythm

| Time | Activity |
| --- | --- |
| Start | Paste the day's prompt from `docs/PROMPTS.md` into Claude Code |
| Morning | Slices 0–2 (red → green → review) |
| Afternoon | Remaining slices |
| End | Full suite + lint + coverage, update `docs/test-cases.md` status column, check the day gate, commit |

### Rules for working with Claude

- Claude never writes implementation before the failing test exists and has been run.
- Test results are pasted from real runs; nothing is marked passed without running.
- Any change to P0 scope or rules: Claude stops and asks, then logs it in the requirements change log.
- After each slice, add a line to `docs/ai-usage.md`: what Claude wrote, and how you checked it.
- You must be able to explain every module in the demo. Ask Claude "explain this as I'd explain it to an evaluator" after each day.

---

## 5. Day-by-day plan

### Day 1 — Requirement lock ✅

- Problem, users, P0/P1/P2 scope, 10 business rules, validation rules, 10 user stories with Given/When/Then, API contract, data model, traceability.
- **Gate passed:** requirements signed off and locked.

### Day 2 — UI/UX design guide and screens ✅

- Design direction (Minimalism & Swiss), tokens, type, status system, components with TailGrids mapping, screen specs, states, accessibility checklist.
- Grayscale wireframes for 7 screens with two directions for Dashboard and Details; colour mockups for 5 screens.
- **Gate passed:** Dashboard A and Details A approved.

### Day 3 — Setup and backend core (TDD)

**Skill:** `nestjs-best-practices` · **Prompt:** `docs/PROMPTS.md` → Day 3

| Slice | Work | Test cases |
| --- | --- | --- |
| 0 Setup | docker-compose (Postgres 16, `proofly` + `proofly_test`), `.env.example`, Nest scaffold (strict), ConfigModule with fail-fast env validation, Prisma schema + first migration + PrismaService, shared `setupApp()` (prefix `/api/v1`, ValidationPipe, cookie-parser, CORS), Jest e2e on the test DB, GitHub Actions (lint, unit, e2e) | — |
| 1 Date rules | `DatesService` + injectable clock (Asia/Kolkata) | UT-DATE-01 → 24 |
| 2 Error shape | Global exception filter, ValidationPipe `exceptionFactory` with field errors | API-ERR-01 → 05 |
| 3 Auth | Register, login, logout, me; bcrypt; JWT cookie; global guard + `@Public()`; `@CurrentUser()` | API-AUTH-01 → 12 |
| 4 Alert settings | `PATCH /users/me/settings` | API-SET-01 → 06 |
| 5 Purchases CRUD | Create/list/get/update/delete, every validation rule, computed status fields, ownership 404 | API-PUR-01 → 30 |

**Gate:** all listed tests green; DatesService coverage ≥ 90%; lint clean; red → green commits visible in `git log`.

### Day 4 — Backend features (TDD)

**Skill:** `nestjs-best-practices` · **Prompt:** Day 4

| Slice | Work | Test cases |
| --- | --- | --- |
| 1 Receipts | Upload (MIME + signature, 5 MB, 5 files), private download, delete; StorageService interface with local disk | API-ATT-01 → 14 |
| 2 Service records | CRUD under an owned purchase, newest first | API-SVC-01 → 10 |
| 3 Cascade | Delete purchase removes files, attachments and service records | API-PUR-31 → 32 |
| 4 Dashboard | Counts, needs-action (soonest first), recently expired (30 days), recent 5, user alert windows | API-DASH-01 → 08 |
| 5 Search/filter/sort | q, category, returnStatus, warrantyStatus, sort, pagination | API-SRCH-01 → 10 |
| 6 Seed | Two demo users, 7 purchases matching the mockups, dates relative to today | API-SEED-01 → 02 |

**Gate:** every endpoint in the API contract has happy-path and error-path tests; `npm run seed` works on a fresh DB.

### Day 5 — Frontend core (TDD)

**Skills:** `vue-best-practices`, `vue-router-best-practices`, `vue-pinia-best-practices`, `vue-testing-best-practices` · Tailwind v4 · TailGrids patterns · **Prompt:** Day 5

| Slice | Work | Test cases |
| --- | --- | --- |
| 0 Scaffold | Vite + Vue 3 + TS + Pinia + Router + Vitest + ESLint; `@tailwindcss/vite`; `@theme` tokens from ui-guide §2; Lexend + Source Sans 3; Lucide; Vite proxy `/api` | — |
| 1 Data layer | API client (cookies, typed `ApiError`), auth store, route guards with return-to | FE-API-01 → 04, FE-AUTH-01 → 06 |
| 2 Base components | StatusBadge, BaseButton, inputs, ErrorSummary, EmptyState, Skeleton, ConfirmDialog, Toast | FE-CMP-01 → 16 |
| 3 Shell + auth pages | AppShell (sidebar ≥ 1024 px, bottom bar below), Sign in, Create account | FE-PAGE-01 → 04 |
| 4 Purchases | List (table ≥ 768 px, cards below), Add/Edit form with live previews | FE-PAGE-05 → 12 |
| 5 Details | Direction A page, receipts upload/download | FE-PAGE-13 → 17 |

**Gate:** component tests green; screens match the mockups at 360 / 768 / 1280 px; full create → view flow works against the real API.

### Day 6 — Frontend features and E2E

**Skills:** Vue skills + `ui-ux-pro-max` (review only) · **Prompt:** Day 6

| Slice | Work | Test cases |
| --- | --- | --- |
| 1 Dashboard | Direction A, counts link to filtered list | FE-PAGE-18 → 21 |
| 2 Service + delete | Service record dialog; delete purchase confirm | FE-PAGE-22 → 25 |
| 3 Settings | Alert windows with live preview; sign out | FE-PAGE-26 → 28 |
| 4 Search UI | Filters as chips, sort, pagination, empty/no-results/error | FE-PAGE-29 → 32 |
| 5 Playwright | Core journey, privacy, mobile viewport | E2E-01 → 08 |
| 6 Quality pass | ui-guide §8 + UI UX Pro Max checklist on every screen | NFR-01 → 12 |

**Gate:** all P0 stories demonstrable in the browser; test matrix executed with real results; no open critical defects.

### Day 7 — UAT and delivery

| Time | Work |
| --- | --- |
| Morning | Fresh clone → README-only setup check. You run UAT-01 → 13 from `docs/uat-report.md` and record results. |
| Midday | Fix critical/high defects test-first (failing test reproduces each bug before the fix). Retest. |
| Afternoon | `docs/architecture.md` (+ `html-diagram`), `docs/security.md`, `docs/decisions.md`, `docs/demo-script.md`, `CHANGELOG.md`, screenshots. Rehearse demo twice. Tag `v1.0.0`. |

**Gate (exit):** UAT exit criteria met (section 7), clean-setup check passed, all tests green, docs complete.

---

## 6. Test strategy summary

Full details: `docs/test-plan.md`. Every case with ID, steps and expected result: `docs/test-cases.md`.

| Level | Tool | Count (planned) | Where |
| --- | --- | --- | --- |
| Unit (date rules) | Jest | 24 | `apps/api/src/common/dates/*.spec.ts` |
| API e2e | Jest + Supertest | 99 | `apps/api/test/*.e2e-spec.ts` |
| Frontend unit/component | Vitest + Vue Test Utils | ~58 | `apps/web/src/**/*.spec.ts` |
| End-to-end | Playwright | 8 | `e2e/*.spec.ts` |
| Non-functional | Manual checklist | 12 | `docs/test-cases.md` §7 |
| UAT | Manual, by you | 13 | `docs/uat-report.md` |

---

## 7. UAT

- **Entry:** all P0 stories built; automated suites green; seed data loaded; fresh-clone setup works.
- **Who:** you (or a colleague) acting as the user, following `docs/uat-report.md` without looking at the code.
- **Exit:** UAT-01 → 08, 11 and 13 pass; zero open Critical/High defects (or explicitly accepted); every fix retested with evidence; report signed.
- **Severity:** Critical = blocks a P0 flow or leaks data · High = wrong date, status or data · Medium = UX issue with a workaround · Low = cosmetic.

---

## 8. Deliverables checklist

- [ ] Working MVP (all P0 stories), seeded demo data, tag `v1.0.0`
- [ ] Source: `apps/api`, `apps/web`, `e2e/`, migrations, seed
- [ ] `README.md` verified from a fresh clone
- [ ] Tests: unit, API e2e, component, Playwright; results recorded in `docs/test-cases.md`
- [ ] Docs: `requirements.md`, `plan.md`, `test-plan.md`, `test-cases.md`, `uat-report.md`, `architecture.md`, `security.md`, `decisions.md`, `ai-usage.md`, `demo-script.md`, `SKILLS.md`, `CHANGELOG.md`
- [ ] Design: `ui-guide.md`, `wireframes.html`, `mockups/`, final screenshots
- [ ] 5-minute demo rehearsed twice, with a backup recording

---

## 9. Demo plan (5 minutes)

| Time | Show | Say |
| --- | --- | --- |
| 0:00–0:30 | README | Problem and users |
| 0:30–1:00 | Dashboard | Needs-action list, soonest first |
| 1:00–2:00 | Add purchase + receipt | Validation, live date preview, private upload |
| 2:00–3:00 | Purchase details | How warranty and return dates are calculated; deadline-day rule |
| 3:00–3:40 | Service record | History stays with the product |
| 3:40–4:20 | Search + privacy | User B gets "not found" on user A's receipt |
| 4:20–5:00 | Tests + architecture | `git log` red → green, test counts, MVP trade-offs, future work |

---

## 10. Evaluation mapping

| Criterion | Evidence |
| --- | --- |
| Problem understanding | `requirements.md`: users, business rules with worked examples |
| Feature prioritisation | P0/P1/P2 with reasons; `decisions.md` |
| UI/UX | `ui-guide.md`, wireframes with two directions, mockups, responsive screens, accessibility checklist |
| Code quality | Feature modules, DTO validation, one error shape, one date module, lint in CI |
| Functional completeness | Live purchase → receipt → deadline → service flow |
| Testing | TDD commit history, ~200 automated tests, test-cases.md with real results, UAT report |
| Understanding | Explain date rules, ownership checks, cookie auth and the data model without notes |

---

## 11. Risks

| Risk | Mitigation |
| --- | --- |
| Off-by-one or time-zone date bugs | DATE columns, one DatesService, 24 unit tests written first, injectable clock |
| A day slips | Cut P1 (search polish, sort) first; P0 never shrinks |
| Upload security gaps | MIME + magic-byte check, private storage, ownership tests |
| AI-written code you can't explain | Review every slice; daily "explain it" prompt; `ai-usage.md` |
| README fails on another machine | Fresh-clone check on Day 7 morning |
| Live demo failure | Seed script, two rehearsals, backup recording |

---

## 12. Definition of done

**Per slice:** tests written first and seen failing → passing; lint and types clean; acceptance criteria met; loading/empty/error states handled (frontend); `test-cases.md` status updated; you approved.

**Project:** every P0 story passes UAT; no open Critical/High defects; README verified; docs complete; demo rehearsed; `v1.0.0` tagged.
