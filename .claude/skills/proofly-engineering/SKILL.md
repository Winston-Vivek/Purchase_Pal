---
name: proofly-engineering
description: Use for ANY work on Proofly (Payment_Pal) — NestJS API, Vue frontend, Tailwind styling, tests, docs or diagrams. Combines the project's TDD workflow with the NestJS, Vue, effective-html, UI UX Pro Max, TailGrids and Tailwind v4 rules, and says which upstream skill to load for each kind of task.
---

# Proofly engineering skill

One working guide for this repo. It combines six sources and adds the project's own rules. When this file and an upstream skill disagree, **this file and the project docs win**, because they hold the locked decisions.

| Source | Kind | Load it when |
| --- | --- | --- |
| `nestjs-best-practices` ([Kadajett/agent-nestjs-skills](https://github.com/Kadajett/agent-nestjs-skills)) | Installed skill | Any file under `apps/api` |
| `vue-best-practices`, `vue-router-best-practices`, `vue-pinia-best-practices`, `vue-testing-best-practices` ([vuejs-ai/skills](https://github.com/vuejs-ai/skills)) | Installed skills | Any file under `apps/web` |
| `html-wireframe`, `html-prototype`, `html-diagram` ([plannotator/effective-html](https://github.com/plannotator/effective-html)) | Installed skills | Wireframes, prototypes, diagrams in `design/` or `docs/` |
| `ui-ux-pro-max` ([nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)) | Installed skill | Reviewing a screen (not restyling it) |
| [TailGrids/tailgrids-vue](https://github.com/TailGrids/tailgrids-vue) | Reference repo | Picking markup for cards, tables, forms, modals, badges |
| [tailwindlabs/tailwindcss](https://github.com/tailwindlabs/tailwindcss) | Reference (Tailwind v4) | Any styling |

Project documents that override everything: `docs/requirements.md` (locked), `design/ui-guide.md`, `docs/plan.md`, `docs/test-cases.md`.

---

## 1. Workflow: TDD, one slice at a time

1. Find the slice in `docs/plan.md` and its test IDs in `docs/test-cases.md`.
2. **Red:** write those tests exactly as specified (same IDs in the test names, e.g. `it('UT-DATE-13 deadline today is not expired', ...)`). Run them. Show that they fail for the right reason. Commit `test(<area>): UT-DATE-01..24`.
3. **Green:** write the minimum code to pass. Run the slice's tests, then the full suite. Commit `feat(<area>): ...`.
4. **Refactor:** check against the rules below with the tests still green. Commit `refactor(<area>): ...` if anything changed.
5. **Report and stop:** test summary (real output), files changed, anything to review. Update the Status column in `docs/test-cases.md` with Pass/Fail and the date. Wait for "next".

Never: write code before its failing test has run, mark a test passed without running it, change P0 scope or a business rule without asking, or weaken a test to make it pass.

Bugs: write a failing test that reproduces the bug first, then fix it.

---

## 2. Backend: NestJS (from `nestjs-best-practices`)

**Architecture**
- Feature modules: `auth/`, `users/`, `purchases/`, `attachments/`, `service-records/`, `dashboard/`, plus `common/` (dates, filters, decorators) and `database/` (DataSource, migrations). Each feature owns its entity. Each module owns its controller, service and DTOs (`arch-feature-modules`).
- One job per service; controllers only map HTTP to service calls (`arch-single-responsibility`). No circular imports between modules (`arch-avoid-circular-deps`); export only what other modules need (`arch-module-sharing`).

**Org NestJS template conventions** (adopted 28 Oct 2026)
- **All database access goes through a repository** in `src/repositories/<name>/<name>.repository.ts`, registered and exported from the global `RepositoriesModule`. Services, controllers and guards never touch a TypeORM `Repository` or the `DataSource` directly.
- Repository methods take `userId` and fold it into the WHERE clause, so ownership cannot be forgotten by a caller (BR-09).
- **REST handler names** on resource controllers: `index` (GET /), `store` (POST /), `show` (GET /:x), `update`, `destroy` (DELETE /:x).
- **Route params are named**, never bare `id`: `:purchaseId`, `:attachmentId`, `:serviceRecordId`.
- **Every input has its own DTO**, documented with `@ApiProperty` / `@ApiPropertyOptional`. Derive an update DTO from its store DTO *only* when update semantics really are "all fields optional" — not when `null` means "clear this".
- Controllers stay thin: route params, DTO, guard, call a service. Services own use-case logic. Response mappers own representation.
- **Where the template and `docs/requirements.md` disagree, the requirements win.** The template maps a full update to `PUT`; §9 locks `PATCH /purchases/:id`, so the verb stays `PATCH`.

**Dependency injection**
- Constructor injection only (`di-prefer-constructor-injection`).
- Use injection tokens for swappable parts: `CLOCK` (fixed "today" in tests) and `STORAGE` (local disk now, S3 later) (`di-use-interfaces-tokens`).

**Errors**
- Throw Nest HTTP exceptions from services (`error-throw-http-exceptions`); never try/catch to format responses in controllers.
- One global exception filter produces `{ error: { code, message, fields? } }` for everything, including unknown errors (500 `INTERNAL`, no stack trace) (`error-use-exception-filters`).
- Always `await` async calls; no floating promises (`error-handle-async-errors`).

**Security**
- Global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`; class-validator on every DTO, query and param (`security-validate-all-input`). Validate UUID params (`ParseUUIDPipe`).
- JWT secret from config, never in code; short payload (`sub` only); verify the user still exists (`security-auth-jwt`). Token in an httpOnly, SameSite=Lax cookie (project decision).
- Global auth guard with a `@Public()` decorator for register/login (`security-use-guards`).
- Never return `passwordHash`; map entities to response DTOs (`security-sanitize-output`, `api-use-dto-serialization`).
- Ownership in services: every query includes `userId`. Not yours → `NotFoundException` (404), never 403.

**Data**
- TypeORM migrations only. `synchronize` is `false` in every environment — it alters schemas behind the migrations and can drop columns (`db-use-migrations`).
- Include relations in one query; no loops of queries (`db-avoid-n-plus-one`).
- Use a transaction when a change spans tables plus files, e.g. deleting a purchase and its attachments (`db-use-transactions`).

**Config and ops**
- `@nestjs/config` with validation that fails fast on missing `DATABASE_URL` or a short `JWT_SECRET` (`devops-use-config-module`).
- `app.enableShutdownHooks()` (`devops-graceful-shutdown`).

**Tests**
- Unit: `Test.createTestingModule` with mocked providers (`test-use-testing-module`).
- E2E: Supertest on an app built with the **same** `setupApp()` as `main.ts` (`test-e2e-supertest`); real `proofly_test` database, truncated between tests; clock overridden to 2026-10-27.

---

## 3. Project rules the code must encode

- **Date-only** (`DATE`, `YYYY-MM-DD`); "today" in `APP_TIMEZONE` (Asia/Kolkata). All date maths lives in `common/dates/DatesService`.
- **Warranty end:** add N months to the start. If that day doesn't exist in the target month, the end is that month's last day (31 Jan + 1 → 28 Feb; 29 Feb 2024 + 12 → 28 Feb 2025). Otherwise subtract one day (15 Jan 2026 + 12 → 14 Jan 2027).
- **Return deadline:** manual date if given, else purchase date + window days.
- **Inclusive:** daysLeft 0 is still open. Status: null → NOT_SET; < 0 → EXPIRED; 0..alertDays → EXPIRING_SOON; > alertDays → ACTIVE. Alert days come from the user's settings.
- **Uploads:** PDF/JPEG/PNG/WEBP by MIME **and** magic bytes; ≤ 5 MB; ≤ 5 per purchase; random storage key outside any public folder; stream downloads only to the owner.
- **Status is computed per response, never stored.**

---

## 4. Frontend: Vue (from the Vue skills)

**Core** (`vue-best-practices`)
- Vue 3, Composition API, `<script setup lang="ts">`; SFC order script → template → style.
- Minimal source state; derive with `computed`; watchers only for side effects.
- Props down, events up; typed `defineProps`/`defineEmits`; `v-model` only for real two-way contracts.
- Keep templates declarative; move branching into script. Never `v-html` with user data.
- Split by responsibility, not file length. Reusable logic goes in composables (`useApi`, `usePurchaseForm`, `useDateStatus`).
- Before a feature, sketch its component boundaries and which component owns which state.

**Router** (`vue-router-best-practices`)
- Async guards that **return** a route (no deprecated `next()`); always `await` inside guards.
- Guard against redirect loops: signed-in users visiting `/login` go to `/dashboard`, and signed-out users go to `/login?redirect=…` only when the target isn't `/login`.
- The same component is reused when only params change, so watch `route.params.id` to reload details.

**Pinia** (`vue-pinia-best-practices`)
- Setup stores return every piece of state.
- Destructure with `storeToRefs`, not plain destructuring (which breaks reactivity).
- Search and filter state lives in the URL query, so refresh and share keep it (`state-url-for-ephemeral-filters`).
- Install Pinia before any store is used (`pinia-no-active-pinia-error`).

**Testing** (`vue-testing-best-practices`)
- Vitest + Vue Test Utils; test behaviour through the DOM as a black box, not internals.
- `await flushPromises()` after async actions; use `createTestingPinia` for store-dependent components.
- No snapshot-only tests. Teleported dialogs: query `document.body`.
- Playwright for end-to-end.

---

## 5. Styling: Tailwind v4 + TailGrids + the UI guide

**Tailwind v4** (tailwindlabs/tailwindcss)
- Install `tailwindcss` + `@tailwindcss/vite`; CSS entry is `@import "tailwindcss";` plus our `@theme { ... }` block copied **exactly** from `design/ui-guide.md` §2. No `tailwind.config.js`.
- Tokens become utilities: `--color-primary` → `bg-primary`/`text-primary`, `--font-heading` → `font-heading`. Components use only tokens; no raw hex, no `bg-blue-600`.
- Mobile-first: unprefixed = phone; `md:` (768 px) table instead of cards; `lg:` (1024 px) sidebar instead of the bottom bar.
- v3 → v4 names to watch when copying old markup: `shadow-sm` → `shadow-xs`, `rounded-sm` → `rounded-xs`, `outline-none` → `outline-hidden`, `flex-grow` → `grow`, `flex-shrink-0` → `shrink-0`, `bg-opacity-50` → `bg-black/50`. Borders and rings default to `currentColor` and `ring` is 1 px, so always set a colour, and use `ring-2` for focus.

**TailGrids Vue** (reference only)
- The repo is archived (Feb 2026) and built for Tailwind v3 with its own plugin and colour names (`primary`, `body-color`, `stroke`, `dark`). Don't install `tailgrids`.
- Take the **structure** of a block (card, table, modal, form group, badge), then rewrite every class with our tokens and v4 names. Remove its shadows and gradients (our style is borders only).

**UI guide + UI UX Pro Max**
- `design/ui-guide.md` is the spec: components (§4), screens (§6), states (§7). Match `design/mockups/*.png`.
- Every status badge = icon + words + colour (never colour alone). Dates `27 Oct 2026`, money `₹24,900.00`, `tabular-nums` on numbers.
- Every data screen has loading (skeleton), empty, error and success states; destructive actions need `ConfirmDialog`.
- Before reporting a screen: run the ui-guide §8 checklist (contrast ≥ 4.5:1, labels, `aria-describedby` on errors, focus ring, 44 px targets, no horizontal scroll at 360/768/1024/1440, `prefers-reduced-motion`, page title). Use `ui-ux-pro-max` to review against its UX rules, but **don't adopt its palette or style suggestions**; the guide is locked.

---

## 6. HTML artifacts (effective-html)

- `html-diagram` for `docs/architecture.md`: request flow (browser → Vue → Nest guard → pipe → service → TypeORM repository → Postgres) and the ER diagram. Self-contained HTML, responsive, accessible.
- `html-wireframe` / `html-prototype` only if a screen changes. Update `design/wireframes.html` rather than starting a new file.
- Use semantic landmarks, headings and real buttons, links and inputs in all HTML.

---

## 7. Commits and docs

- Conventional commits: `test:`, `feat:`, `refactor:`, `fix:`, `docs:`, `chore:`; small and focused.
- After each slice: one line per AI-written change in `docs/ai-usage.md` (what, and how you verified it); update `docs/test-cases.md` Status.
- Decisions with trade-offs go in `docs/decisions.md` (what, alternatives, why).
- Keep the README "Setup" and "Commands" sections correct whenever scripts change.
