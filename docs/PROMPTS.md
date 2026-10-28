# Claude Code prompts for Proofly

Paste one prompt at a time into Claude Code, run from `~/Documents/Payment_Pal`. Claude Code reads `CLAUDE.md` automatically, so every prompt can stay short. After each slice it stops and reports; reply **"next"** to continue, or give corrections.

Before the first prompt:

```bash
cd ~/Documents/Payment_Pal
git init && git add . && git commit -m "docs: requirements, design guide, wireframes, mockups"
claude
```

Then install the skills listed in `docs/SKILLS.md`.

---

## Day 3 — Setup and backend core

```
Read CLAUDE.md, docs/requirements.md, docs/plan.md (Day 3) and docs/test-cases.md first. Use the proofly-engineering skill and nestjs-best-practices throughout. For each TDD slice, write the exact test cases listed for it in docs/plan.md, using their IDs in the test names.

Today is Day 3: project setup and the backend core, test-first. Work in these slices and stop after each one for my review:

Slice 0 – Setup (no TDD needed):
- docker-compose.yml with PostgreSQL 16 (databases proofly and proofly_test), .env.example with every variable, root README setup section.
- Scaffold apps/api with the NestJS CLI (strict TS). Add @nestjs/config with env validation that fails fast, Prisma with the schema from docs/requirements.md §10 (users with alert-day settings, purchases, attachments, service_records, cascades, indexes) and the first migration, and a PrismaService.
- A shared setupApp(app) used by main.ts AND the e2e tests: global prefix /api/v1, ValidationPipe (whitelist, forbidNonWhitelisted, transform), cookie-parser, CORS limited to WEB_ORIGIN.
- Jest e2e config that runs against proofly_test, applies migrations and truncates tables between tests.
- GitHub Actions workflow: lint + unit + e2e with a Postgres service.

Slice 1 – DatesService (TDD): unit tests first for BR-01 to BR-05 using every worked example in requirements §6, plus month-end clamping, leap day, deadline day, day after, null inputs, and exact 30/7-day thresholds. Use an injectable clock so tests fix "today" in Asia/Kolkata. Then implement. Target ≥ 90% coverage.

Slice 2 – Error shape (TDD): e2e tests that a validation failure, an unknown route and an unhandled error all return { error: { code, message, fields? } } with the codes from CLAUDE.md. Then the global exception filter and the ValidationPipe exceptionFactory.

Slice 3 – Auth (TDD): e2e tests for US-01 (register 201 + cookie, duplicate email 409, bad login 401 with no cookie, /auth/me, logout clears the cookie, data endpoints 401 without a cookie). Then the AuthModule: bcrypt, JWT in an httpOnly SameSite=Lax cookie, a global guard with a @Public() decorator, and a @CurrentUser() decorator. Password hash is never returned.

Slice 4 – Alert settings (TDD): e2e tests for PATCH /users/me/settings (ranges 1–365 and 1–60, unknown fields rejected). Then implement.

Slice 5 – Purchases CRUD (TDD): e2e tests for US-02, US-04, US-05 and US-09: create with every §7 validation rule (including cross-field ones: warranty start and months together, return deadline ≥ purchase date, purchase date not in the future), list (paginated { items, total, page, pageSize }), get, PATCH, DELETE, the computed fields (returnDeadline, returnStatus, returnDaysLeft, warrantyExpiry, warrantyStatus, warrantyDaysLeft, hasReceipt), and user B getting 404 on every one of user A's purchases. Then implement.

For every TDD slice: show the failing run, commit test:, implement, show the passing run, commit feat:. End the day with the full suite, lint and coverage output, and a short summary for docs/decisions.md.
```

---

## Day 4 — Backend features

```
Read CLAUDE.md and docs/plan.md (Day 4). Use proofly-engineering + nestjs-best-practices. Day 4, same TDD slice rules as Day 3: write each slice's test IDs from docs/test-cases.md first.

Slice 1 – Receipts (US-03, BR-06, BR-10): e2e tests first. Upload with FileInterceptor: allowed types checked by MIME and file signature (magic bytes), 413 over 5 MB, 415 for wrong types, 400 when a purchase already has 5 files, nothing written to disk on rejection. Download streams only to the owner (StreamableFile, Content-Disposition with the original name), delete removes the row and the file. Storage goes behind a StorageService interface with a local-disk implementation outside any public folder and random keys.
Slice 2 – Service records (US-07, BR-07): CRUD under an owned purchase, newest first, cross-user 404.
Slice 3 – Cascade (BR-08): deleting a purchase removes its attachments (rows and files) and service records.
Slice 4 – Dashboard (US-06): counts (total, under warranty, open returns, need action), needsAction sorted by fewest days left, recently expired (last 30 days), recent 5. Uses the user's alert settings.
Slice 5 – Search, filter and sort (US-10): q over product name, seller and notes (case-insensitive); category, returnStatus and warrantyStatus filters; sort by newest, price and nearest deadline.
Slice 6 – Seed script: demo@proofly.test and other@proofly.test (password demo1234) with the 7 purchases used in design/mockups (dates relative to today so the demo statuses always match).

End with: full suite, coverage, and an endpoint table for docs/architecture.md.
```

---

## Day 5 — Frontend core screens

```
use vue skill. Read CLAUDE.md, docs/plan.md (Day 5), docs/test-cases.md §3–4, design/ui-guide.md and look at design/mockups/*.png. Use proofly-engineering (Tailwind v4 + TailGrids porting rules). Apply ui-ux-pro-max only as a reviewer; the guide wins on any conflict.

Day 5, TDD with Vitest + Vue Test Utils for components and stores:
Slice 0 – Scaffold apps/web (Vite, Vue 3, TS, Pinia, Router, Vitest, ESLint). Tailwind v4 via @tailwindcss/vite with the @theme tokens copied exactly from ui-guide §2, Lexend + Source Sans 3, Lucide icons. Vite proxy /api → the Nest API.
Slice 1 – API client (cookie credentials, error shape → typed ApiError) and the Pinia auth store; route guards that send signed-out users to /login and return them afterwards.
Slice 2 – Base components with tests first: StatusBadge (every status in ui-guide §3: icon + text + colour), BaseButton, BaseInput/Select/DateInput/MoneyInput, ErrorSummary (focusable, links to fields), EmptyState, Skeleton, ConfirmDialog (focus trap, Esc), Toast.
Slice 3 – AppShell (sidebar ≥ 1024 px, bottom tab bar below), Sign in / Create account pages.
Slice 4 – My purchases list (table ≥ 768 px, cards below) and Add/Edit purchase form with the live return and warranty previews and data kept after a failed save.
Slice 5 – Purchase details (direction A: single page, Jump-to row on mobile), receipts list with upload and download.

Match the mockups. Check each screen at 360, 768 and 1280 px before reporting.
```

---

## Day 6 — Frontend features and E2E

```
use vue skill. Read CLAUDE.md, docs/plan.md (Day 6), docs/test-cases.md §4–5 and §7, and design/ui-guide.md. Use proofly-engineering. Day 6, tests first for every slice.

Slice 1 – Dashboard (direction A) matching design/mockups/desktop-1-dashboard.png and mobile-1-dashboard.png.
Slice 2 – Service record dialog (add/edit/delete) and delete purchase with ConfirmDialog.
Slice 3 – Settings page (alert windows with a live preview sentence, sign out).
Slice 4 – Search, filters as removable chips, sort, pagination; empty, no-results and error states.
Slice 5 – Playwright (e2e/): login → add purchase → upload receipt → details shows correct dates → add service record → dashboard shows it; plus user B can't open user A's purchase URL. Run on desktop Chrome and a 390 px mobile viewport.
Slice 6 – Run the ui-guide §8 accessibility checklist and the ui-ux-pro-max pre-delivery checklist on every screen; fix what fails and list what you checked.
Then fill in docs/test-plan.md with the test matrix and the real results.
```

---

## Day 7 — UAT and delivery

```
Read CLAUDE.md. Day 7 is UAT and delivery.

1. Clean-setup check: in a fresh clone in /tmp, follow only the README to install, migrate, seed, run and test. Fix the README wherever it was wrong.
2. docs/uat-report.md already has UAT-01 to UAT-13. Fill in the build commit and entry checklist only. Don't fill in results yourself; I will run UAT and give you the outcomes.
3. After I report results, fix critical and high defects test-first (a failing test that reproduces each bug before the fix), and log every defect in the report.
4. Write docs/architecture.md (with an html-diagram of the request flow and the ER model), docs/security.md, docs/decisions.md, docs/demo-script.md (5 minutes, seeded data) and CHANGELOG.md with known limitations.
5. Final gate: lint, all unit/e2e/Playwright tests, coverage summary, then tag v1.0.0.
```

---

## Useful one-liners during the week

- **Review before moving on:** `Review the last slice against nestjs-best-practices and list any rule it breaks before I say next.`
- **Explain for the demo:** `Explain how <feature> works in this codebase as I would explain it to an evaluator, with file references.`
- **A bug I found:** `Bug: <what happened>. Write a failing test that reproduces it first, show it failing, then fix it.`
- **Scope check:** `Is this in P0 per docs/requirements.md? If not, add it to P2 and don't build it.`
