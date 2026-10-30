# Proofly — Decisions

The choices that had a real alternative, why this one, and what it cost. Locked
decisions D-01 to D-12 live in `docs/requirements.md` §5; this file explains the
ones where the reasoning matters or where we moved.

---

## D-03 changed: Prisma → TypeORM

**On Day 3**, after the setup slice and before any feature code.

The `nestjs-best-practices` skill the project is built against is TypeORM-specific:
seven of its rules (`db-use-migrations`, `db-use-transactions`, `db-avoid-n-plus-one`,
`arch-feature-modules`, `devops-use-config-module`, `perf-optimize-database`,
`micro-use-health-checks`) are written in TypeORM and none mention Prisma. Following
them under Prisma would have meant translating every database rule by hand.

**Alternatives:** stay on Prisma and translate the rules; or switch later.

**Why now:** only the setup slice touched the database. No feature code existed, so
this was the cheapest point it could ever be done. The data model (§10), the API
contract (§9), every business rule and P0 scope were untouched — only the library
that talks to Postgres.

**Cost:** about an hour. Logged in the requirements change log.

**One deviation from the skill:** `synchronize` is `false` in every environment, not
just production. The skill's example enables it in development. It alters schemas
behind the migrations' back, and dev drifting from migrations is exactly the bug
`db-use-migrations` exists to prevent.

---

## Date rules exist twice, on purpose

`CLAUDE.md` says all date maths lives in `apps/api/src/common/dates`. The add/edit
form breaks that: it shows the deadline *before* saving (`ui-guide` §6, and visible in
`design/mockups/desktop-3-add-purchase.png`), so BR-01 and BR-02 also run in
`apps/web/src/lib/deadlines.ts`.

**Alternatives considered:**

| Option | Why not |
| --- | --- |
| Ask the server on each keystroke | A round trip per character, and no endpoint for it |
| Drop the preview | The locked design has it, and it is the feature that makes the date rules visible to a user |
| A shared package | The right answer in the abstract. `apps/api` is CommonJS and `apps/web` is ESM; a dual-build package for four functions is more machinery than the risk warrants |

**How the risk is controlled instead:** `deadlines.spec.ts` is pinned to the *same*
table as the API's `DatesService` — `UT-DATE-01..12`, including the month-end clamp
and the leap day. If either side drifts, one of the two suites goes red. It was also
cross-checked against the running server on five awkward inputs with zero drift
(see `docs/ai-usage.md`, 29 Oct).

The browser resolves "today" in Asia/Kolkata, not the user's own zone, so someone
abroad sees the same number of days the server will store (D-10).

---

## No Passport, despite the skill

`security-auth-jwt` prescribes `@nestjs/passport`. The token is in an httpOnly cookie,
not an `Authorization` header, so Passport's extractor machinery adds two dependencies
and buys nothing. The substance of the rule — secret from config, `sub`-only payload,
verify the user still exists — is a 56-line guard.

---

## Uploads are held in memory, not streamed to disk

`requirements.md` §11 says "uploads stream to disk" under Reliability. They do not.

The signature check (BR-10) has to happen **before** the bytes are persisted. A
disk-backed upload writes attacker-supplied content first and validates afterwards,
which inverts the property we want. Holding the file in memory is also what lets
`API-ATT-04/05/06` assert the upload directory is still *empty* after a rejection,
rather than "was written then cleaned up".

Bounded by the 5 MB cap. If Proofly ever accepts large files, this has to change —
and the right change is a streaming signature check, not a plain disk write.

---

## Status is computed per response, never stored

BR-04. There is deliberately no `returnStatus` or `warrantyStatus` column.

A stored status is stale by morning, and it cannot vary per user — but "expiring soon"
depends on *that user's* alert window, so the same purchase is `ACTIVE` for one person
and `EXPIRING_SOON` for another. `API-SET-06` proves it: the same untouched purchase
reads differently at a 7-day window and a 3-day one.

**The cost** is that the dashboard and the search filters cannot be expressed in SQL.
Postgres clamps `date + interval '1 month'` to the month end and BR-01 then does *not*
subtract a day, so a `WHERE` clause would quietly disagree with `DatesService` on
exactly the dates `UT-DATE-02/03/04` exist to pin. Both load the user's own rows and
resolve in memory, one indexed query each. If that ever matters, the answer is a
generated column computed by the same rules — not a hand-written date expression.

---

## Ownership lives in the query, not in a service

`PurchaseRepository` and the other repositories take `userId` on every method and fold
it into the `WHERE` clause. A caller cannot forget it, because there is no method that
does not take it.

Not found is **404, never 403** (BR-09). A 403 confirms the record exists, which is the
one thing a stranger should not learn. Ten A-vs-B cases cover it across read, list,
update, delete, upload, download, search and the dashboard.

---

## Deleting a purchase uses no explicit transaction

`db-use-transactions` names this case. We do not use one.

The rows go in a **single `DELETE`** — the migration put `ON DELETE CASCADE` on both
foreign keys, so the database removes the attachments and service records as part of
that one atomic statement. Wrapping one statement in a transaction is ceremony.

The filesystem is the part that genuinely cannot join a transaction, so files are
removed *after* the rows are certainly gone. That ordering is chosen for its failure
mode: an orphaned file wastes disk, while a row pointing at a missing file breaks a
download for the user.

---

## The gates are executable, and they are tested

`docs/plan.md` describes seven phases each ending in a gate. Prose gates are easy to
wave through under time pressure, so `gates/phases.json` holds the same plan in
machine-readable form and `npm run gate <phase>` checks it.

Two checks carry the weight: `test-ids` requires every case ID from
`docs/test-cases.md` to appear in a real test name **and** pass, and `tdd-history`
reads `git log` and fails if an area's first commit was `feat(` rather than `test(`.

The gate decides whether everything else is trustworthy, which made it the one
component whose failure would be invisible — so its decisions live in
`gates/checks.mjs` with 22 tests of their own. That paid for itself immediately: the
Day 7 UAT check was reading the wrong file *and* would have read the wrong column in
the right one.

---

## What we deliberately did not build

- **Email and push reminders, OCR, analytics, multi-currency, shared households** — P2
  in `requirements.md` §4, documented as future work.
- **Deployment** — D-07 is local-only via docker-compose.
- **Dark mode** — tokens are semantic so it is a token swap later; it would have cost a
  day of contrast QA for something no requirement asks for.
- **A separate repository layer per model beyond what exists, a release dashboard, a
  custom mutation-testing framework** — each would add maintenance without removing a
  failure mode we actually have.
