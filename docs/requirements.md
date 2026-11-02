# Proofly — Requirements (LOCKED v1.0)

**Status:** Locked — Day 1 · **Date:** 27 Oct 2026 · **Owner:** Winston
Changes to P0 after this point need an explicit change note at the bottom of this file.

---

## 1. Problem

People lose purchase receipts, forget return deadlines and warranty expiry dates, and have no record of repairs. When a product fails, they cannot find the invoice or know whether they are still covered, and they miss online return windows.

## 2. Goal

One place where a signed-in user records each purchase, attaches its receipt, sees return and warranty status at a glance, logs service history, and finds any product in seconds.

## 3. Target users

| User | Core need |
| --- | --- |
| Online shoppers | Track return windows and invoices |
| Households | Keep appliance and electronics records together |
| Buyers of expensive products | Warranty and repair history on hand |
| Users with many purchases | Search, filter and retrieve fast |

## 4. Scope

### P0 — must ship
| ID | Feature |
| --- | --- |
| F-01 | Register, log in, log out, current user |
| F-02 | Purchase create, view, edit, delete |
| F-03 | Receipt upload (multiple per purchase), private download, delete |
| F-04 | Return deadline and warranty expiry calculation + computed status |
| F-05 | Dashboard: totals, needs-action list, expired, recent |
| F-06 | Service records: add, list, edit, delete per purchase |
| F-07 | Alert settings: user-configurable "expiring soon" windows |
| F-08 | Data isolation: users only ever see their own data |

### P1 — ship if on schedule
Search by text, filter by category and status, sort; responsive polish; confirm dialogs; empty states.

### P2 — out of scope (documented as future work)
Email/push reminders, OCR receipt scanning, spending analytics, marketplace integrations, multi-currency conversion, shared household accounts, deployment.

## 5. Decisions locked

| # | Decision | Value |
| --- | --- | --- |
| D-01 | Frontend | Vue 3 (Composition API, `<script setup>`), TypeScript, Vite, Pinia, Vue Router, Tailwind CSS v4 |
| D-02 | Backend | NestJS, TypeScript, class-validator DTOs, global ValidationPipe |
| D-03 | Database | PostgreSQL + TypeORM (see change log, 28 Oct 2026) |
| D-04 | Auth | bcrypt + JWT in httpOnly, SameSite=Lax cookie |
| D-05 | Testing | TDD; Jest + Supertest (API), Vitest + Vue Test Utils (UI), Playwright (E2E) |
| D-06 | Code | GitHub repository, one commit set per TDD slice (`test:` → `feat:` → `refactor:`) |
| D-07 | Run target | Local only via docker-compose; no deployment |
| D-08 | Expiring-soon windows | User-configurable; defaults 30 days (warranty), 7 days (return) |
| D-09 | Warranty end date | Start + N months − 1 day (inclusive) |
| D-10 | App time zone | Asia/Kolkata for "today" (config `APP_TIMEZONE`) |
| D-11 | Currency | INR default; stored as ISO 4217 code; no conversion |
| D-12 | UI references | TailGrids Vue patterns ported to Tailwind v4 (repo archived, Tailwind v3) |

## 6. Business rules

**BR-01 Warranty expiry.** `expiry = addMonths(start, N) − 1 day`. If the start day does not exist in the target month, expiry is the last day of that month.
- 15 Jan 2026 + 12 months → **14 Jan 2027**
- 31 Jan 2026 + 1 month → **28 Feb 2026**
- 29 Feb 2024 + 12 months → **28 Feb 2025**
- No warranty start or months → expiry `null`, status **No warranty**.

**BR-02 Return deadline.** If `returnDeadline` is entered manually, it wins. Otherwise `purchaseDate + returnWindowDays`.
- Purchased 20 Oct 2026, 7-day window → **27 Oct 2026**
- Neither given → `null`, status **Not set**.

**BR-03 Inclusive deadlines.** An item is eligible on its deadline date itself and expired from the next day.

**BR-04 Status is computed, never stored.** `daysLeft = deadline − today` (calendar days, APP_TIMEZONE):
| Condition | Status |
| --- | --- |
| deadline is null | Not set / No warranty |
| daysLeft < 0 | Expired |
| 0 ≤ daysLeft ≤ alertDays | Expiring soon |
| daysLeft > alertDays | Active |

`alertDays` = user's `returnAlertDays` for returns, `warrantyAlertDays` for warranties.

**BR-05 Date-only.** All business dates are SQL `DATE` and `YYYY-MM-DD` in the API. No timestamps in rule calculations.

**BR-06 Missing receipt.** A purchase may have no attachment; UI shows **Receipt missing**.

**BR-07 Service records** belong to exactly one purchase owned by the user.

**BR-08 Cascade.** Deleting a purchase deletes its attachments (DB rows and stored files) and service records.

**BR-09 Ownership.** Every read and write is scoped by the authenticated user. Another user's resource returns **404**, never 403, so its existence is not revealed.

**BR-12 Next service due.** A purchase's next service comes from one of two
places, in this order:

1. the newest service record that carries a next-service date (newest by
   service date, then by when it was recorded) — servicing a thing again is
   what resets when the next one is due;
2. failing that, the purchase's own `scheduledServiceDate` — set when you buy
   the thing, because a service record is a log of a visit that happened and a
   brand-new purchase has had none. A service date on a record is on or after
   that record's own service date; one on a purchase is on or after the
   purchase date.

Once any service record schedules a next visit it supersedes the purchase's
date, which stays as the plan it was. Status follows BR-03/BR-04 against the
user's own `serviceAlertDays` window, so an overdue service reads EXPIRED and
a close one EXPIRING_SOON, computed per response like every other status.

**BR-11 Closing a return by hand.** A user can mark a return closed to say they
are keeping the item. A closed return reports `returnStatus: CLOSED` and
`returnDaysLeft: null` whatever its deadline says, stops counting as an open
return, and never appears in Needs action or Recently expired. Reopening it
restores the computed status — the deadline itself is never altered.

**BR-10 Uploads.** PDF, JPEG, PNG, WEBP only (checked by MIME and file signature); max 5 MB per file; max 5 files per purchase. Files stored outside any public folder under a random storage key.

## 7. Validation rules

| Field | Rule |
| --- | --- |
| name | 1–80 chars |
| email | valid email, unique (409 on duplicate) |
| password | 8–72 chars, at least one letter and one number |
| productName | required, 1–120 chars |
| category | one of: ELECTRONICS, APPLIANCES, MOBILE, FURNITURE, FASHION, VEHICLE, HOME_KITCHEN, OTHER |
| seller | optional, ≤ 120 chars |
| purchaseDate | required, valid date, not in the future |
| price | required, ≥ 0, max 2 decimals |
| currency | ISO 4217 code, default INR |
| returnWindowDays | optional integer 0–365 |
| returnDeadline | optional date ≥ purchaseDate |
| warrantyStartDate | optional date ≥ purchaseDate; required if warrantyMonths given |
| warrantyMonths | optional integer 1–120; required if warrantyStartDate given |
| notes | optional, ≤ 1000 chars |
| serviceDate | required, ≥ purchaseDate, not in the future |
| provider | optional, ≤ 120 chars |
| description | required, 1–500 chars |
| cost | optional, ≥ 0, max 2 decimals |
| warrantyAlertDays | integer 1–365 |
| returnAlertDays | integer 1–60 |

## 8. User stories and acceptance criteria

Each criterion maps directly to at least one automated test (written first).

**US-01 Register and log in (F-01)**
- Given valid details, when I register, then my account is created and I am signed in.
- Given an email already in use, when I register, then I get 409 and a clear message.
- Given wrong credentials, when I log in, then I get 401 and no cookie.
- Given I am not signed in, when I call any data endpoint, then I get 401.

**US-02 Add and manage a purchase (F-02)**
- Given valid details, when I save a purchase, then it is stored and appears in my list.
- Given missing or invalid fields, when I save, then I get 400 with field-level messages.
- When I edit a purchase, then changes persist after refresh.
- When I delete a purchase and confirm, then it and its receipts and service records are gone.

**US-03 Receipts (F-03)**
- Given a PDF/JPEG/PNG/WEBP ≤ 5 MB, when I upload it, then it is listed on the purchase and I can download the same file.
- Given an unsupported type or a file > 5 MB, when I upload, then I get 415/413 and nothing is stored.
- Given a purchase with 5 files, when I upload another, then I get 400.

**US-04 Return deadline (F-04)**
- Given purchase date and return window, then the deadline follows BR-02 and status follows BR-04.
- Given a manual deadline, then it overrides the window.
- On the deadline date status is not Expired; the next day it is.

**US-05 Warranty expiry (F-04)**
- Given warranty start and months, then expiry follows BR-01 and status follows BR-04.
- Given no warranty, then the purchase shows **No warranty** and is excluded from warranty counts.

**US-06 Dashboard (F-05)**
- I see: total purchases, active warranties, open returns, items needing action.
- "Needs action" lists every Expiring soon return or warranty, sorted by fewest days left.
- "Recently expired" lists items that expired in the last 30 days.
- "Recent purchases" shows my latest 5.

**US-07 Service history (F-06)**
- When I add a service record to a purchase, then it appears only in that purchase's history, newest first.
- I can edit and delete my service records.

**US-08 Alert settings (F-07)**
- I can set warranty and return alert windows within the allowed ranges.
- After saving, statuses and the dashboard use the new windows immediately.

**US-09 Privacy (F-08)**
- Given user B, when B requests user A's purchase, receipt, service record or settings, then B gets 404 and no data.

**US-10 Find a product (P1)**
- Search matches product name, seller and notes (case-insensitive).
- Filters: category, return status, warranty status. Sort: purchase date, price, nearest deadline.
- Results only ever include my own purchases.

## 9. API contract (`/api/v1`)

| Method | Path | Body / query | Success |
| --- | --- | --- | --- |
| POST | /auth/register | name, email, password | 201 user |
| POST | /auth/login | email, password | 200 user + cookie |
| POST | /auth/logout | — | 204 |
| GET | /auth/me | — | 200 user incl. alert settings |
| PATCH | /users/me/settings | warrantyAlertDays?, returnAlertDays? | 200 settings |
| GET | /dashboard | — | 200 summary |
| GET | /purchases | q, category, returnStatus, warrantyStatus, sort, page, pageSize (≤ 50) | 200 { items, total, page, pageSize } |
| POST | /purchases | purchase fields | 201 purchase |
| GET | /purchases/:id | — | 200 purchase + attachments + services |
| PATCH | /purchases/:id | partial fields | 200 purchase |
| DELETE | /purchases/:id | — | 204 |
| POST | /purchases/:id/attachments | multipart `file` | 201 attachment |
| GET | /attachments/:id | — | 200 file stream |
| DELETE | /attachments/:id | — | 204 |
| GET | /purchases/:id/services | — | 200 list |
| POST | /purchases/:id/services | service fields | 201 service |
| PATCH | /services/:id | partial fields | 200 service |
| DELETE | /services/:id | — | 204 |

Every purchase response includes computed fields:
`returnDeadline`, `returnStatus`, `returnDaysLeft`, `warrantyExpiry`, `warrantyStatus`, `warrantyDaysLeft`, `hasReceipt`.

**Error shape (all endpoints):**
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Invalid input", "fields": { "price": "Must be 0 or more" } } }
```
Codes: `VALIDATION_ERROR` 400 · `UNAUTHENTICATED` 401 · `NOT_FOUND` 404 · `CONFLICT` 409 · `PAYLOAD_TOO_LARGE` 413 · `UNSUPPORTED_MEDIA_TYPE` 415 · `INTERNAL` 500.

## 10. Data model

| Table | Fields |
| --- | --- |
| users | id (uuid), name, email (unique), passwordHash, warrantyAlertDays (30), returnAlertDays (7), createdAt, updatedAt |
| purchases | id, userId → users, productName, category, seller, purchaseDate (DATE), price (DECIMAL 12,2), currency, returnWindowDays, returnDeadline (DATE), warrantyStartDate (DATE), warrantyMonths, notes, createdAt, updatedAt |
| attachments | id, purchaseId → purchases (cascade), storageKey (unique), fileName, mimeType, fileSize, uploadedAt |
| service_records | id, purchaseId → purchases (cascade), serviceDate (DATE), provider, description, cost (DECIMAL 12,2), notes, createdAt, updatedAt |

Indexes: purchases(userId), purchases(userId, purchaseDate), attachments(purchaseId), service_records(purchaseId).

## 11. Non-functional requirements

- **Security:** bcrypt cost ≥ 10; JWT secret from env; httpOnly cookie; CORS limited to the web origin; ValidationPipe `whitelist` + `forbidNonWhitelisted`; no secrets in git.
- **Privacy:** ownership enforced in services, verified by e2e tests (BR-09).
- **Usability:** works at 360 px; statuses use text plus colour; keyboard reachable; form data kept after a failed save.
- **Reliability:** consistent error shape; uploads stream to disk; no unhandled promise rejections.
- **Reproducibility:** fresh clone runs with README steps only (`docker compose up`, migrate, seed, dev).
- **Quality:** lint and all tests pass in CI on every push; ≥ 90% coverage on the dates module.

## 12. Assumptions

- One user per account; no shared households.
- Prices are recorded, not converted.
- Demo uses seeded accounts (`demo@proofly.test`, `other@proofly.test`).
- Local file storage is acceptable for the MVP; storage sits behind an interface so S3 can replace it.

## 13. Traceability

| Story | Rules | Tests (planned) | UAT |
| --- | --- | --- | --- |
| US-01 | — | T-12, auth e2e | UAT-01 |
| US-02 | BR-08 | T-01, T-02, T-11, T-13 | UAT-02, UAT-12 |
| US-03 | BR-06, BR-10 | T-03, T-04 | UAT-03, UAT-11 |
| US-04 | BR-02, BR-03, BR-04 | T-06, T-07, dates unit | UAT-04 |
| US-05 | BR-01, BR-04 | T-05, dates unit | UAT-04, UAT-11 |
| US-06 | BR-04 | dashboard e2e | UAT-05 |
| US-07 | BR-07 | T-08 | UAT-06 |
| US-08 | BR-04 | settings e2e | new UAT-13 |
| US-09 | BR-09 | T-09 | UAT-08 |
| US-10 | BR-09 | T-10 | UAT-07 |

## 14. Change log

| Date | Change | Reason |
| --- | --- | --- |
| 27 Oct 2026 | v1.0 locked | Day 1 gate |
| 2 Nov 2026 | **BR-12 amended: `scheduled_service_date` added to purchases.** The next service now falls back to a date held on the purchase when no service record carries one. | As first built, the date lived only on a service record — and a service record logs a visit that already happened, with §7 refusing a future service date. So a thing you had never serviced could not be scheduled at all, which is exactly the case that matters: a new motorcycle whose first service is three months out. |
| 2 Nov 2026 | **BR-12 added: a service record can say when the next service is due** (`next_service_date` on service_records, `service_alert_days` on users, default 14). Adds `nextServiceDate`, `serviceStatus` and `serviceDaysLeft` to the purchase response and `SERVICE` to the dashboard's deadline kinds. No existing rule changes. | Requested after UAT. A warranty tells you when cover ends but not when the thing is next due for a service, which for anything mechanical is the deadline that actually costs money to miss. It reuses BR-03/BR-04 exactly, so it is a third deadline rather than a new mechanism. |
| 2 Nov 2026 | **BR-11 added: a return can be closed by hand** (`return_closed` on purchases, `returnClosed` on PATCH). Adds `CLOSED` to the return status values in §9. No existing rule changes; the deadline is still computed exactly as BR-02 says and is never overwritten. | Requested after UAT. A user who has decided to keep an item has no way to stop Proofly counting it as an open return and nagging about it in Needs action, so the dashboard keeps showing work that is already done. |
| 28 Oct 2026 | **D-03 changed: Prisma → TypeORM.** No change to the data model (§10), the API contract (§9), any business rule or P0 scope — only the library that talks to Postgres. | The `nestjs-best-practices` skill the project is built against is TypeORM-specific: 7 of its rules (`db-use-migrations`, `db-use-transactions`, `db-avoid-n-plus-one`, `arch-feature-modules`, `devops-use-config-module`, `perf-optimize-database`, `micro-use-health-checks`) are written in TypeORM and none mention Prisma, so following them under Prisma would mean translating every database rule by hand. Made on Day 3 while only the setup slice touched the database and no feature code existed, which is the cheapest point it could be done. `synchronize` stays `false` in every environment; migrations only. |
