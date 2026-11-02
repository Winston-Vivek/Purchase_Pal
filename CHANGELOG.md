# Changelog

All notable changes to Proofly. Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-10-30

First release. The complete P0 scope from `docs/requirements.md` §4, built over
seven days, test-first, with each day closed by an executable gate.

### Added

**Purchases** — create, view, edit and delete a purchase with product, category,
seller, date, price, notes, an optional return window or manual deadline, and an
optional warranty start and length. Paginated list, a table at ≥ 768 px and cards
below.

**Deadlines** — return deadline and warranty expiry computed from the purchase,
never stored, with days remaining and a status of Active, Expiring soon, Expired
or Not set. Previewed live in the form before saving. All dates resolve in
Asia/Kolkata on both the server and the browser.

**Dashboard** — four counts, the items needing action soonest first, what expired
in the last 30 days, and the five most recent purchases. All against the signed-in
user's own alert windows.

**Receipts** — upload PDF, JPEG, PNG or WEBP up to 5 MB, five per purchase,
validated by content type *and* file signature. Download streams only to the
owner. Deleting a purchase removes its files.

**Service history** — repair and service records under a purchase, newest first,
with provider, cost and notes.

**Search and filtering** — free text across product name, seller and notes;
filters for category, return status and warranty status; sort by newest, price or
nearest deadline. All held in the URL, so a filtered list survives a refresh and
can be shared.

**Accounts** — register, sign in, sign out. bcrypt passwords, a JWT in an httpOnly
cookie. Per-user alert windows (warranty 1–365 days, return 1–60).

**Privacy** — every query is scoped to the signed-in user. Another user's record is
*not found*, never *forbidden*.

**Accessibility** — every status is an icon, words and a colour; 44 px touch
targets; visible focus; no horizontal scroll at 360, 768, 1024 or 1440 px;
`prefers-reduced-motion` respected. Checklist in `design/ui-guide.md` §8, results in
`docs/test-cases.md` §6.

### Testing

289 automated tests, each named with its case ID from `docs/test-cases.md`:

| | |
| --- | --- |
| Unit (Jest) | 25 — the date rules |
| API end-to-end (Supertest) | 107 — the real pipeline, a real database |
| Component (Vitest + Vue Test Utils) | 140 |
| Browser (Playwright) | 17 — seven journeys, a 390 px viewport, accessibility |
| The gate itself (`node:test`) | 22 |

`npm run gate dayN` fails if a case has no test, if a test fails, if a case is
still "Not run", or if an area's first commit was `feat(` rather than `test(`.

### Fixed during delivery

- **A fresh clone could not build.** `.gitignore` had a bare `storage/`, which also
  matched `apps/api/src/common/storage/` and kept three source files out of the
  repository entirely. Found by the clean-setup check (`NFR-12`), not by any test.
  The ignore is now anchored to `var/`. (`41f010c`)
- **The README's setup was wrong** — one `npm install` where three are needed, and
  no mention of the second terminal. Rewritten from what actually worked in a
  clean clone. (`23ede49`)
- **A second checkout could not start the database** — `container_name` in
  `docker-compose.yml` made the name exclusive. Removed. (`23ede49`)
- **The Day 7 gate read the wrong file and the wrong column**, so it could have
  passed an unrun UAT. Gate logic moved into `gates/checks.mjs` with 22 tests of
  its own. (`d96d366`, `7152424`)
- **Two touch and focus defects** found by the accessibility pass: the mobile logo
  was a 32 px target, and two elements both claimed `aria-current="page"`.
- **`multer` and `js-yaml`** pinned past their advisories via `overrides`, since
  NestJS 11 pins both to exact vulnerable versions. Neither was reachable in this
  code; see `docs/security.md` §9.

### Changed

- **Prisma → TypeORM** on Day 3, before any feature code, to match the
  `nestjs-best-practices` skill the project is built against. Reasoning in
  `docs/decisions.md`.
- `API-AUTH-12` moved from the Day 3 gate to Day 4, where the endpoint it covers
  is built.

---

## Known limitations

Deliberate. Each is a decision, not an oversight.

### Not built (P2 in `requirements.md` §4)

Email, push and in-app reminders · OCR of receipts · spending analytics ·
multi-currency · shared household accounts · export · password reset · dark mode.

### Operational

- **CI has never run.** `.github/workflows/ci.yml` exists and does
  `checkout → npm ci → build → test` — and *would* have caught the `.gitignore`
  defect automatically. There is no git remote, so it has never executed. **This is
  the single highest-value thing to do next.**
- **No deployment.** Local only, via `docker-compose` (D-07). No hosting, no domain,
  no TLS.
- **No backups or restore procedure.** Data lives in one local Postgres volume.
- **Migrations have never been rolled back in anger.** `migration:revert` exists and
  is untested against real data.

### Product

- **Extended warranties are not recorded.** A purchase holds the manufacturer's
  term only; an extension bought separately — different provider, its own cost
  and end date — has nowhere to go. Designed (a separate `extended_warranties`
  record, so the original term is never overwritten) and **deliberately
  deferred**, not forgotten.

- **The add/edit form has no Receipt fieldset.** The mockup
  (`design/mockups/desktop-3-add-purchase.png`) shows one; receipts are uploaded
  from the details page after saving instead. No test case covers it, so no gate
  caught it. Recorded here rather than added unverified at the end — a purchase
  must exist before a file can be attached to it, so the fieldset needs a decision
  about holding the file through a failed save.
- **No bulk actions** — purchases are deleted one at a time.
- **No pagination on service records or attachments** — bounded at 5 attachments;
  service records are not, so a product with hundreds of repairs would render them
  all.

### Technical

- **The date rules exist in two places** — `apps/api/src/common/dates` and
  `apps/web/src/lib/deadlines.ts` — so the form can preview a deadline before
  saving. Both are pinned to the same `UT-DATE` table; drift turns a suite red.
  Reasoning in `docs/decisions.md`.
- **The dashboard and status filters resolve in memory**, not in SQL, because
  Postgres' month arithmetic disagrees with BR-01 on clamped dates. One indexed
  query per request, bounded by one user's rows.
- **Uploads are buffered in memory**, not streamed, so the signature check can run
  before anything is written. Bounded by the 5 MB cap.
- **No rate limiting and no `helmet`** — see `docs/security.md` §8 for the full gap
  list and what production would need.
- **Dev-only audit findings remain**: 9 low in the API (`jest`, `@nestjs/cli`) and
  2 in the web app (`vitest`). Production dependencies report zero. Both would need
  a major test-runner upgrade mid-delivery.
- **Three mutations were tested by hand, not by a mutation-testing tool** — the
  ownership clause, the inclusive boundary and the magic-byte check were each
  broken deliberately to confirm a test caught it. Not automated.
