# Proofly — Test Cases

**Version:** 1.0 · Written before the code (TDD). Each slice in `docs/plan.md` names the IDs it must make pass.

**Fixed clock for unit and API tests:** today = **2026-10-27** in **Asia/Kolkata**. Default alert windows: warranty **30** days, return **7** days.
**Priority:** P0 = must pass to release · P1 = should pass.
**Status:** update after each real run (`Pass 2026-10-29`, `Fail D-03`). Never mark a case passed without running it.

Contents: 1 Unit (dates) · 2 API e2e · 3 Frontend unit/component · 4 Frontend pages · 5 End-to-end · 6 Seed · 7 Non-functional · 8 Traceability

---

## 1. Unit — DatesService (`apps/api/src/common/dates/dates.service.spec.ts`)

### 1.1 Warranty expiry (BR-01)

| ID | Input | Expected | Pri | Status |
| --- | --- | --- | --- | --- |
| UT-DATE-01 | start 2026-01-15, 12 months | 2027-01-14 | P0 | Pass 2026-10-28 |
| UT-DATE-02 | start 2026-01-31, 1 month (Feb has no 31st) | 2026-02-28 (month end) | P0 | Pass 2026-10-29 |
| UT-DATE-03 | start 2024-02-29, 12 months (leap day) | 2025-02-28 | P0 | Pass 2026-10-28 |
| UT-DATE-04 | start 2026-03-31, 1 month | 2026-04-30 | P0 | Pass 2026-10-28 |
| UT-DATE-05 | start 2025-11-02, 12 months | 2026-11-01 | P0 | Pass 2026-10-28 |
| UT-DATE-06 | start 2024-10-20, 24 months | 2026-10-19 | P0 | Pass 2026-10-28 |
| UT-DATE-07 | start null or months null | null (No warranty) | P0 | Pass 2026-10-28 |

### 1.2 Return deadline (BR-02)

| ID | Input | Expected | Pri | Status |
| --- | --- | --- | --- | --- |
| UT-DATE-08 | purchase 2026-10-20, window 7 | 2026-10-27 | P0 | Pass 2026-10-28 |
| UT-DATE-09 | purchase 2026-10-20, window 7, manual deadline 2026-11-15 | 2026-11-15 (manual wins) | P0 | Pass 2026-10-28 |
| UT-DATE-10 | purchase 2026-10-20, no window, no manual | null (Not set) | P0 | Pass 2026-10-28 |
| UT-DATE-11 | purchase 2026-10-20, window 0 | 2026-10-20 | P1 | Pass 2026-10-28 |
| UT-DATE-12 | purchase 2026-12-28, window 10 (crosses year) | 2027-01-07 | P1 | Pass 2026-10-28 |

### 1.3 Status and days left (BR-03, BR-04) — today 2026-10-27

| ID | Input | Expected | Pri | Status |
| --- | --- | --- | --- | --- |
| UT-DATE-13 | return deadline 2026-10-27 (today) | daysLeft 0, EXPIRING_SOON (not expired) | P0 | Pass 2026-10-28 |
| UT-DATE-14 | return deadline 2026-10-26 | daysLeft −1, EXPIRED | P0 | Pass 2026-10-28 |
| UT-DATE-15 | return deadline 2026-11-03, alert 7 | daysLeft 7, EXPIRING_SOON (boundary in) | P0 | Pass 2026-10-28 |
| UT-DATE-16 | return deadline 2026-11-04, alert 7 | daysLeft 8, ACTIVE (boundary out) | P0 | Pass 2026-10-28 |
| UT-DATE-17 | warranty expiry 2026-11-26, alert 30 | daysLeft 30, EXPIRING_SOON | P0 | Pass 2026-10-28 |
| UT-DATE-18 | warranty expiry 2026-11-27, alert 30 | daysLeft 31, ACTIVE | P0 | Pass 2026-10-28 |
| UT-DATE-19 | warranty expiry 2026-12-20, alert 60 (user setting) | daysLeft 54, EXPIRING_SOON | P0 | Pass 2026-10-28 |
| UT-DATE-20 | deadline null | daysLeft null, NOT_SET | P0 | Pass 2026-10-28 |
| UT-DATE-21 | expiry 2027-01-14 | daysLeft 79 (crosses month and year) | P1 | Pass 2026-10-28 |

### 1.4 Today in the app time zone (BR-05, D-10)

| ID | Input | Expected | Pri | Status |
| --- | --- | --- | --- | --- |
| UT-DATE-22 | clock 2026-10-27T18:29:00Z (23:59 IST) | today = 2026-10-27 | P0 | Pass 2026-10-28 |
| UT-DATE-23 | clock 2026-10-27T18:31:00Z (00:01 IST next day) | today = 2026-10-28 | P0 | Pass 2026-10-28 |
| UT-DATE-24 | invalid date string "2026-02-30" passed to the parser | throws, no silent roll-over to March | P1 | Pass 2026-10-28 |

---

### 1.5 Email templates (`apps/api/src/common/mail/templates.spec.ts`)

| ID | Case | Expected | Pri | Status |
| --- | --- | --- | --- | --- |
| UT-MAIL-01 | Reset email | The link is in the plain-text part as well as the HTML; says it lasts 30 minutes and that ignoring it is safe | P1 | Pass 2026-11-02 |
| UT-MAIL-02 | Reset email | Never contains a password | P1 | Pass 2026-11-02 |
| UT-MAIL-03 | Password-changed notice | Names the time and says what to do if it was not you | P1 | Pass 2026-11-02 |
| UT-MAIL-04 | Deadline digest | One message naming every deadline; singular for one | P1 | Pass 2026-11-02 |
| UT-MAIL-05 | Deadline digest | A product name is escaped in the HTML part — a mail client renders it | P1 | Pass 2026-11-02 |

---

## 2. API e2e (`apps/api/test/*.e2e-spec.ts`)

All requests use `/api/v1`. "Signed in as A" = A's auth cookie. Errors must use the shape `{ error: { code, message, fields? } }`.

### 2.1 Error shape (`errors.e2e-spec.ts`)

| ID | Scenario | Expected | Pri | Status |
| --- | --- | --- | --- | --- |
| API-ERR-01 | POST /auth/register with empty body | 400, code VALIDATION_ERROR, `fields` has name, email, password | P0 | Pass 2026-10-28 |
| API-ERR-02 | GET /api/v1/unknown | 404, code NOT_FOUND | P0 | Pass 2026-10-28 |
| API-ERR-03 | Unhandled exception thrown in a test-only route | 500, code INTERNAL, no stack trace in body | P0 | Pass 2026-10-28 |
| API-ERR-04 | Unknown property in a body (`isAdmin: true`) | 400 VALIDATION_ERROR naming the property | P0 | Pass 2026-10-28 |
| API-ERR-05 | Malformed JSON body | 400 VALIDATION_ERROR | P1 | Pass 2026-10-28 |

### 2.2 Auth (`auth.e2e-spec.ts`) — US-01

| ID | Scenario | Expected | Pri | Status |
| --- | --- | --- | --- | --- |
| API-AUTH-01 | Register valid name/email/password | 201; body has id, name, email, alert settings; sets httpOnly cookie | P0 | Pass 2026-10-28 |
| API-AUTH-02 | Register response and DB | No `password`/`passwordHash` in body; stored hash ≠ password (bcrypt) | P0 | Pass 2026-10-28 |
| API-AUTH-03 | Register with an existing email (any case) | 409 CONFLICT | P0 | Pass 2026-10-28 |
| API-AUTH-04 | Register password "short1" (< 8) | 400, fields.password | P0 | Pass 2026-10-28 |
| API-AUTH-05 | Register password "longpassword" (no digit) | 400, fields.password | P0 | Pass 2026-10-28 |
| API-AUTH-06 | Register invalid email | 400, fields.email | P0 | Pass 2026-10-28 |
| API-AUTH-07 | Login correct credentials | 200 + cookie (HttpOnly, SameSite=Lax, Path=/) | P0 | Pass 2026-10-28 |
| API-AUTH-08 | Login wrong password / unknown email | 401 UNAUTHENTICATED, same message for both, no cookie | P0 | Pass 2026-10-28 |
| API-AUTH-09 | GET /auth/me with cookie | 200 current user | P0 | Pass 2026-10-28 |
| API-AUTH-10 | GET /auth/me without cookie, or a tampered/expired token | 401 | P0 | Pass 2026-10-28 |
| API-AUTH-11 | POST /auth/logout | 204; cookie cleared; next /auth/me → 401 | P0 | Pass 2026-10-28 |
| API-AUTH-12 | GET /purchases, /dashboard without cookie | 401 on each | P0 | Pass 2026-10-28 |
| API-AUTH-13 | `POST /auth/forgot-password` for a real account (BR-14) | 202; one email sent carrying a link to `APP_URL/reset-password?token=…` | P0 | Pass 2026-11-02 |
| API-AUTH-14 | Same, for an address with no account | 202, byte-identical body; no email sent | P0 | Pass 2026-11-02 |
| API-AUTH-15 | The raw token is never stored | The row holds a SHA-256 digest; the token itself appears nowhere in the database | P0 | Pass 2026-11-02 |
| API-AUTH-16 | `POST /auth/reset-password` with a valid token | 200; the new password signs in and the old one does not | P0 | Pass 2026-11-02 |
| API-AUTH-17 | The same token twice | Second attempt 400; the password is unchanged by it | P0 | Pass 2026-11-02 |
| API-AUTH-18 | An expired token (31 minutes old) | 400 | P0 | Pass 2026-11-02 |
| API-AUTH-19 | A token that was never issued, or one tampered with | 400, same message as expired | P0 | Pass 2026-11-02 |
| API-AUTH-20 | Asking twice | The first token stops working; the second one works | P1 | Pass 2026-11-02 |
| API-AUTH-21 | A session open before the reset (BR-13) | Its cookie stops working; a cookie from the new password works | P0 | Pass 2026-11-02 |
| API-AUTH-22 | Reset with a password that breaks the rules | 400 naming the field; the token is still usable afterwards | P1 | Pass 2026-11-02 |
| API-AUTH-23 | `PATCH /users/me/password` with the right current password | 200; the new password signs in, the old one does not | P0 | Pass 2026-11-02 |
| API-AUTH-24 | Wrong current password | 400 naming the field, not 401 — a 401 reads as an expired session | P0 | Pass 2026-11-02 |
| API-AUTH-25 | A new password that breaks the rules | 400; the password is unchanged | P1 | Pass 2026-11-02 |
| API-AUTH-26 | The device that made the change (BR-13) | Keeps working — it is re-issued a cookie, so nobody is signed out by their own action | P0 | Pass 2026-11-02 |
| API-AUTH-27 | Another device signed in beforehand (BR-13) | Signed out | P0 | Pass 2026-11-02 |
| API-AUTH-28 | Signed out caller | 401; no password is changed | P0 | Pass 2026-11-02 |
| API-USR-01 | `PATCH /users/me` with a name | 200; the new name comes back and is on `/auth/me` | P1 | Pass 2026-11-02 |
| API-USR-02 | `POST /users/me/email` (BR-15) | 202; the link goes to the NEW address, and the OLD one is told a change was asked for | P0 | Pass 2026-11-02 |
| API-USR-03 | The address is not changed until the link is opened | `/auth/me` still shows the old address; the old one still signs in | P0 | Pass 2026-11-02 |
| API-USR-04 | `POST /users/me/email/confirm` with the token | 200; the new address signs in and the old one does not | P0 | Pass 2026-11-02 |
| API-USR-05 | Requesting a change to an address already in use | 409; nothing sent | P0 | Pass 2026-11-02 |
| API-USR-06 | Requesting with the wrong current password | 400; nothing sent | P0 | Pass 2026-11-02 |
| API-USR-07 | A spent, expired or invented confirmation token | 400, one message for all three | P0 | Pass 2026-11-02 |

> **API-AUTH-12 is verified by the Day 4 gate, not Day 3.** Its `/purchases` half passes as of Day 3 Slice 5. The `/dashboard` half cannot: Nest runs guards after routing, so a route that does not exist returns 404 rather than 401. `/dashboard` is built in Day 4 Slice 4, and the test is unchanged.

### 2.3 Alert settings (`settings.e2e-spec.ts`) — US-08

| ID | Scenario | Expected | Pri | Status |
| --- | --- | --- | --- | --- |
| API-SET-01 | New user defaults | warrantyAlertDays 30, returnAlertDays 7 | P0 | Pass 2026-10-28 |
| API-SET-02 | PATCH warrantyAlertDays 60 | 200; /auth/me shows 60 | P0 | Pass 2026-10-28 |
| API-SET-03 | PATCH warrantyAlertDays 0 or 366 | 400 fields.warrantyAlertDays | P0 | Pass 2026-10-28 |
| API-SET-04 | PATCH returnAlertDays 0 or 61 | 400 fields.returnAlertDays | P0 | Pass 2026-10-28 |
| API-SET-05 | PATCH with `email` or unknown field | 400 (not allowed here) | P0 | Pass 2026-10-28 |
| API-SET-06 | After PATCH returnAlertDays 3, purchase with return in 5 days | returnStatus changes from EXPIRING_SOON to ACTIVE | P0 | Pass 2026-10-28 |
| API-SET-07 | `serviceAlertDays` 1–365 | In range saved; 0 and 366 rejected; narrowing it drops a service out of needs action | P1 | Pass 2026-11-02 |

### 2.4 Purchases (`purchases.e2e-spec.ts`) — US-02, US-04, US-05, US-09

Valid base body: `{ productName: "AirPods Pro (2nd generation)", category: "ELECTRONICS", seller: "Amazon", purchaseDate: "2026-10-27", price: 24900, returnWindowDays: 7, warrantyStartDate: "2026-10-27", warrantyMonths: 12 }`

| ID | Scenario | Expected | Pri | Status |
| --- | --- | --- | --- | --- |
| API-PUR-01 | Create with valid base body | 201; returns id and all fields; currency INR | P0 | Pass 2026-10-28 |
| API-PUR-02 | Computed fields on create | returnDeadline 2026-11-03, returnStatus EXPIRING_SOON, returnDaysLeft 7, warrantyExpiry 2027-10-26, warrantyStatus ACTIVE, warrantyDaysLeft 364, hasReceipt false | P0 | Pass 2026-10-28 |
| API-PUR-03 | Create with only productName, category, purchaseDate, price | 201; return and warranty statuses NOT_SET | P0 | Pass 2026-10-28 |
| API-PUR-04 | Missing productName | 400 fields.productName | P0 | Pass 2026-10-28 |
| API-PUR-05 | productName 121 chars | 400 fields.productName | P1 | Pass 2026-10-28 |
| API-PUR-06 | category "TOYS" | 400 fields.category | P0 | Pass 2026-10-28 |
| API-PUR-07 | purchaseDate 2026-10-28 (future) | 400 fields.purchaseDate | P0 | Pass 2026-10-28 |
| API-PUR-08 | purchaseDate "2026-02-30" or "27/10/2026" | 400 fields.purchaseDate | P0 | Pass 2026-10-28 |
| API-PUR-09 | price −1 | 400 fields.price | P0 | Pass 2026-10-28 |
| API-PUR-10 | price 10.999 (3 decimals) | 400 fields.price | P1 | Pass 2026-10-28 |
| API-PUR-11 | returnWindowDays 366 | 400 fields.returnWindowDays | P1 | Pass 2026-10-28 |
| API-PUR-12 | returnDeadline before purchaseDate | 400 fields.returnDeadline | P0 | Pass 2026-10-28 |
| API-PUR-13 | warrantyMonths without warrantyStartDate | 400 fields.warrantyStartDate | P0 | Pass 2026-10-28 |
| API-PUR-14 | warrantyStartDate without warrantyMonths | 400 fields.warrantyMonths | P0 | Pass 2026-10-28 |
| API-PUR-15 | warrantyStartDate before purchaseDate | 400 fields.warrantyStartDate | P0 | Pass 2026-10-28 |
| API-PUR-16 | warrantyMonths 0 or 121 | 400 fields.warrantyMonths | P1 | Pass 2026-10-28 |
| API-PUR-17 | currency "RUPEE" | 400 fields.currency | P1 | Pass 2026-10-28 |
| API-PUR-18 | notes 1001 chars | 400 fields.notes | P1 | Pass 2026-10-28 |
| API-PUR-19 | Manual returnDeadline 2026-11-15 with window 7 | returnDeadline 2026-11-15 | P0 | Pass 2026-10-28 |
| API-PUR-20 | Purchase 2026-10-12, window 10 (closed 2026-10-22) | returnStatus EXPIRED, returnDaysLeft −5 | P0 | Pass 2026-10-28 |
| API-PUR-21 | List with 3 purchases | 200 `{ items, total: 3, page: 1, pageSize: 20 }`, newest purchaseDate first | P0 | Pass 2026-10-28 |
| API-PUR-22 | List pageSize 51 | 400 | P1 | Pass 2026-10-28 |
| API-PUR-23 | GET /purchases/:id (own) | 200 with `attachments: []`, `serviceRecords: []` | P0 | Pass 2026-10-28 |
| API-PUR-24 | GET /purchases/not-a-uuid | 400 or 404 (never 500) | P0 | Pass 2026-10-28 |
| API-PUR-25 | PATCH warrantyMonths 24 | 200; warrantyExpiry 2028-10-26; persists on GET | P0 | Pass 2026-10-28 |
| API-PUR-26 | PATCH that breaks a cross-field rule (remove warrantyStartDate only) | 400 | P0 | Pass 2026-10-28 |
| API-PUR-27 | DELETE own purchase | 204; GET → 404 | P0 | Pass 2026-10-28 |
| API-PUR-28 | B: GET A's purchase | 404 NOT_FOUND, no data | P0 | Pass 2026-10-28 |
| API-PUR-29 | B: PATCH and DELETE A's purchase | 404 each; A's purchase unchanged | P0 | Pass 2026-10-28 |
| API-PUR-30 | B: list purchases | Only B's purchases (A's not included) | P0 | Pass 2026-10-28 |
| API-PUR-31 | DELETE purchase with 2 attachments + 2 service records (Day 4) | Rows gone; stored files gone from disk | P0 | Pass 2026-10-28 |
| API-PUR-32 | hasReceipt after one upload (Day 4) | true; false again after deleting it | P0 | Pass 2026-10-28 |
| API-PUR-33 | PATCH `returnClosed: true` on a purchase with an open return (BR-11) | 200; `returnStatus: CLOSED`, `returnDaysLeft: null`; `returnDeadline` unchanged | P1 | Pass 2026-11-02 |
| API-PUR-34 | PATCH `returnClosed: false` again | Computed status comes back exactly as it was | P1 | Pass 2026-11-02 |
| API-PUR-35 | Closing a return whose deadline has already passed | `CLOSED` wins over `EXPIRED` | P1 | Pass 2026-11-02 |
| API-PUR-36 | B closes A's return | 404; A's purchase untouched | P1 | Pass 2026-11-02 |
| API-PUR-37 | Purchase with two services, the newer one giving a next date (BR-12) | `nextServiceDate` is the newer one's; `serviceStatus` and `serviceDaysLeft` follow it | P1 | Pass 2026-11-02 |
| API-PUR-38 | Newest service has no next date, an older one does | Newest record WITH a date wins; a purchase with none reads NOT_SET and null | P1 | Pass 2026-11-02 |
| API-PUR-39 | Purchase with `scheduledServiceDate` and no service records (BR-12) | That date is the next service, with status and days left from it | P1 | Pass 2026-11-02 |
| API-PUR-40 | A service record schedules a visit on a purchase that already had a date | The record wins; clearing the record's date falls back to the purchase's | P1 | Pass 2026-11-02 |
| API-PUR-41 | `scheduledServiceDate` before the purchase date | 400 naming the field | P1 | Pass 2026-11-02 |

### 2.5 Receipts (`attachments.e2e-spec.ts`) — US-03, BR-06, BR-10

| ID | Scenario | Expected | Pri | Status |
| --- | --- | --- | --- | --- |
| API-ATT-01 | Upload receipt.pdf to own purchase | 201; id, fileName, mimeType application/pdf, fileSize | P0 | Pass 2026-10-28 |
| API-ATT-02 | Upload .jpg, .png, .webp | 201 each | P0 | Pass 2026-10-28 |
| API-ATT-03 | Download own attachment | 200; bytes identical to upload; Content-Disposition has original name | P0 | Pass 2026-10-28 |
| API-ATT-04 | Upload big.pdf (5.2 MB) | 413 PAYLOAD_TOO_LARGE; nothing saved | P0 | Pass 2026-10-28 |
| API-ATT-05 | Upload malware.exe | 415 UNSUPPORTED_MEDIA_TYPE; nothing saved | P0 | Pass 2026-10-28 |
| API-ATT-06 | Upload fake.pdf (text renamed .pdf) | 415 (file signature check) | P0 | Pass 2026-10-28 |
| API-ATT-07 | 6th file on one purchase | 400; still 5 files | P0 | Pass 2026-10-28 |
| API-ATT-08 | Upload with no file field | 400 | P1 | Pass 2026-10-28 |
| API-ATT-09 | Stored file path | Under UPLOAD_DIR, random key, not the original name, not under a public/static route | P0 | Pass 2026-10-28 |
| API-ATT-10 | B: download A's attachment | 404 | P0 | Pass 2026-10-28 |
| API-ATT-11 | B: upload to A's purchase | 404; nothing saved | P0 | Pass 2026-10-28 |
| API-ATT-12 | B: delete A's attachment | 404; file still there | P0 | Pass 2026-10-28 |
| API-ATT-13 | DELETE own attachment | 204; row and file removed | P0 | Pass 2026-10-28 |
| API-ATT-14 | Download without cookie | 401 | P0 | Pass 2026-10-28 |

### 2.6 Service records (`service-records.e2e-spec.ts`) — US-07, BR-07

| ID | Scenario | Expected | Pri | Status |
| --- | --- | --- | --- | --- |
| API-SVC-01 | Add valid record (date, description, provider, cost) | 201 | P0 | Pass 2026-10-28 |
| API-SVC-02 | List for a purchase with 2 records | Newest serviceDate first; only that purchase's records | P0 | Pass 2026-10-28 |
| API-SVC-03 | Missing description | 400 fields.description | P0 | Pass 2026-10-28 |
| API-SVC-04 | serviceDate before purchaseDate | 400 fields.serviceDate | P0 | Pass 2026-10-28 |
| API-SVC-05 | serviceDate in the future | 400 fields.serviceDate | P0 | Pass 2026-10-28 |
| API-SVC-06 | cost −5 | 400 fields.cost | P1 | Pass 2026-10-28 |
| API-SVC-07 | PATCH own record | 200; persists | P0 | Pass 2026-10-28 |
| API-SVC-08 | DELETE own record | 204 | P0 | Pass 2026-10-28 |
| API-SVC-09 | B: list/add on A's purchase | 404 | P0 | Pass 2026-10-28 |
| API-SVC-10 | B: PATCH/DELETE A's record | 404; record unchanged | P0 | Pass 2026-10-28 |
| API-SVC-11 | Create a service record with `nextServiceDate` (BR-12) | 201; the date comes back on the record | P1 | Pass 2026-11-02 |
| API-SVC-12 | `nextServiceDate` before the service date | 400 naming the field | P1 | Pass 2026-11-02 |

### 2.7 Dashboard (`dashboard.e2e-spec.ts`) — US-06

Fixture for A (today 2026-10-27), matching the design mockups:

| Purchase | Bought | Return | Warranty |
| --- | --- | --- | --- |
| Nike Pegasus 41 (no receipt) | 2026-10-24 | 7 days → 2026-10-31 | none |
| AirPods Pro | 2026-10-27 | 7 days → 2026-11-03 | 12 m → 2027-10-26 |
| Philips Air Fryer | 2026-10-12 | 10 days → 2026-10-22 (closed) | 24 m → 2028-10-11 |
| Samsung 1.5 T AC (seller Croma) | 2025-11-02 | none | 12 m → 2026-11-01 |
| iPhone 15 | 2026-01-15 | none | 12 m → 2027-01-14 |
| Dell XPS 13 (₹1,24,990) | 2025-03-10 | none | 24 m → 2027-03-09 |
| LG washer | 2024-10-20 | none | 24 m → 2026-10-19 (ended) |

| ID | Scenario | Expected | Pri | Status |
| --- | --- | --- | --- | --- |
| API-DASH-01 | Counts | total 7, underWarranty 5, openReturns 2, needsAction 3 | P0 | Pass 2026-10-28 |
| API-DASH-02 | needsAction order | Nike (4 days), Samsung (5), AirPods (7) | P0 | Pass 2026-10-28 |
| API-DASH-03 | needsAction items | Each has purchaseId, productName, kind (RETURN/WARRANTY), date, daysLeft | P0 | Pass 2026-10-28 |
| API-DASH-04 | recentlyExpired | Air fryer (return, 2026-10-22), LG (warranty, 2026-10-19); nothing older than 30 days | P0 | Pass 2026-10-28 |
| API-DASH-05 | recentPurchases | Latest 5 by purchaseDate | P0 | Pass 2026-10-28 |
| API-DASH-06 | User with returnAlertDays 3 | Nike leaves needsAction; AirPods leaves needsAction | P0 | Pass 2026-10-28 |
| API-DASH-07 | New user, no purchases | All counts 0, empty lists | P0 | Pass 2026-10-28 |
| API-DASH-08 | B's dashboard | Counts only from B's purchases | P0 | Pass 2026-10-28 |
| API-DASH-09 | A closed return that was expiring soon (BR-11) | Drops out of needsAction and out of the open-returns count; the purchase itself is still listed | P1 | Pass 2026-11-02 |
| API-DASH-10 | A service due inside the window (BR-12) | Appears in needsAction with kind SERVICE, sorted with the rest by days left | P1 | Pass 2026-11-02 |

### 2.8 Search, filter, sort (`purchases-search.e2e-spec.ts`) — US-10 (P1)

| ID | Scenario | Expected | Pri | Status |
| --- | --- | --- | --- | --- |
| API-SRCH-01 | q=airpods | AirPods only (case-insensitive) | P1 | Pass 2026-10-28 |
| API-SRCH-02 | q=croma (seller) | Samsung AC | P1 | Pass 2026-10-28 |
| API-SRCH-03 | q matches notes text | That purchase | P1 | Pass 2026-10-28 |
| API-SRCH-04 | category=APPLIANCES | Samsung AC, LG washer | P1 | Pass 2026-10-28 |
| API-SRCH-05 | returnStatus=EXPIRING_SOON | Nike, AirPods | P1 | Pass 2026-10-28 |
| API-SRCH-06 | warrantyStatus=EXPIRED | LG washer | P1 | Pass 2026-10-28 |
| API-SRCH-07 | sort=price_desc | Dell first | P1 | Pass 2026-10-28 |
| API-SRCH-08 | sort=deadline_asc | Nike, Samsung, AirPods first | P1 | Pass 2026-10-28 |
| API-SRCH-09 | page=2, pageSize=5 | Items 6–7, total 7 | P1 | Pass 2026-10-28 |
| API-SRCH-10 | B searches q=airpods | Empty (A's data never returned) | P0 | Pass 2026-10-28 |

---

## 3. Frontend unit/component (`apps/web/src/**/*.spec.ts`)

### 3.1 API client and auth

| ID | Scenario | Expected | Pri | Status |
| --- | --- | --- | --- | --- |
| FE-API-01 | Requests | Sent with credentials (cookies) to `/api/v1/...` | P0 | Pass 2026-10-29 |
| FE-API-02 | 400 response with `fields` | Throws ApiError with code, message, fields | P0 | Pass 2026-10-29 |
| FE-API-03 | 401 on a data call | Auth store cleared; router goes to /login?redirect=<current> | P0 | Pass 2026-10-29 |
| FE-API-04 | Network failure | ApiError code NETWORK with a readable message | P1 | Pass 2026-10-29 |
| FE-API-05 | A success with an empty body (200, 202) | Returns undefined rather than throwing on JSON.parse — only 204 was handled, and forgot/reset answer 202 and 200 with no content | P0 | Pass 2026-11-02 |
| FE-AUTH-01 | Store login success | user set; isAuthenticated true | P0 | Pass 2026-10-29 |
| FE-AUTH-02 | Store login 401 | Error message shown; user null | P0 | Pass 2026-10-29 |
| FE-AUTH-03 | Guard: signed out → /purchases | Redirect to /login?redirect=/purchases | P0 | Pass 2026-10-29 |
| FE-AUTH-04 | After login with redirect | Lands on /purchases | P0 | Pass 2026-10-29 |
| FE-AUTH-05 | Guard: signed in → /login | Redirect to /dashboard (no redirect loop) | P0 | Pass 2026-10-29 |
| FE-AUTH-06 | App start with valid cookie | /auth/me restores the session | P0 | Pass 2026-10-29 |
| FE-AUTH-07 | Signed in, opening a reset link | The reset page opens rather than bouncing to the dashboard — the token is the authority there, not the session | P1 | Pass 2026-11-02 |

### 3.2 Base components

| ID | Component | Scenario | Expected | Pri | Status |
| --- | --- | --- | --- | --- | --- |
| FE-CMP-01 | StatusBadge | RETURN EXPIRING_SOON, 3 days | Text "Return closes in 3 days", warning icon, warn tokens | P0 | Pass 2026-10-29 |
| FE-CMP-02 | StatusBadge | RETURN daysLeft 0 | "Return closes today" | P0 | Pass 2026-10-29 |
| FE-CMP-03 | StatusBadge | WARRANTY EXPIRED 2026-10-19 | "Warranty ended 19 Oct 2026", x icon | P0 | Pass 2026-10-29 |
| FE-CMP-04 | StatusBadge | WARRANTY ACTIVE 364 | "Covered · 364 days left" | P0 | Pass 2026-10-29 |
| FE-CMP-05 | StatusBadge | NOT_SET | "No return window" / "No warranty" | P0 | Pass 2026-10-29 |
| FE-CMP-06 | StatusBadge | Any status | Icon has aria-hidden; meaning is in the text | P0 | Pass 2026-10-29 |
| FE-CMP-07 | formatDate / formatMoney | 2026-10-27 / 24900 INR | "27 Oct 2026" / "₹24,900.00" | P0 | Pass 2026-10-29 |
| FE-CMP-08 | BaseButton | loading | Disabled, shows "Saving…", keeps width | P1 | Pass 2026-10-29 |
| FE-CMP-09 | BaseInput | error prop | aria-invalid true, aria-describedby → error text | P0 | Pass 2026-10-29 |
| FE-CMP-10 | ErrorSummary | 2 errors | role=alert, gets focus, each link focuses its field | P0 | Pass 2026-10-29 |
| FE-CMP-11 | ConfirmDialog | open | Focus inside, Esc closes, focus returns to trigger | P0 | Pass 2026-10-29 |
| FE-CMP-12 | ConfirmDialog | confirm | Emits confirm once; cancel emits nothing | P0 | Pass 2026-10-29 |
| FE-CMP-13 | EmptyState | Renders | Message + action button/link | P1 | Pass 2026-10-29 |
| FE-CMP-14 | Toast | success | role=status, auto-dismiss | P1 | Pass 2026-10-29 |
| FE-CMP-15 | FileDrop | 6 MB file or .exe chosen | Inline error before upload; no request sent | P0 | Pass 2026-10-29 |
| FE-CMP-16 | Skeleton | loading | aria-busy on the region | P1 | Pass 2026-10-29 |
| FE-CMP-17 | StatusBadge | Return with status CLOSED (BR-11) | Reads "Keeping it" in a neutral tone — never confused with an expired window's "Return closed <date>" | P1 | Pass 2026-11-02 |
| FE-CMP-18 | BaseButton | Button with an icon and a label | Icon and label sit on one line — Tailwind Preflight makes `svg` display:block, which breaks them apart inside an inline wrapper | P1 | Pass 2026-11-02 |
| FE-CMP-19 | RowMenu | Keyboard | Opens on Enter with the first item focused; arrows move; Esc closes and returns focus to the trigger | P1 | Pass 2026-11-02 |
| FE-CMP-20 | StatusBadge | kind SERVICE in each status | Reads "Service due in N days" / "Service overdue" / "No service due" — never a return or warranty phrase | P1 | Pass 2026-11-02 |

## 4. Frontend pages (`apps/web/src/pages/**/*.spec.ts`)

| ID | Page | Scenario | Expected | Pri | Status |
| --- | --- | --- | --- | --- | --- |
| FE-PAGE-01 | Sign in | Valid submit | Calls login; goes to dashboard | P0 | Pass 2026-10-29 |
| FE-PAGE-02 | Sign in | 401 | "Email or password is incorrect" (doesn't say which) | P0 | Pass 2026-10-29 |
| FE-PAGE-03 | Create account | Validation | Password rule hint; field errors from API shown inline | P0 | Pass 2026-10-29 |
| FE-PAGE-04 | AppShell | Current route | aria-current="page" on the active nav item | P1 | Pass 2026-10-29 |
| FE-PAGE-05 | My purchases | Loading | Skeleton shown | P1 | Pass 2026-10-29 |
| FE-PAGE-06 | My purchases | Data | Rows show name, date, price, return badge, warranty badge, receipt state | P0 | Pass 2026-10-29 |
| FE-PAGE-07 | My purchases | Empty | "No purchases yet" + Add purchase | P0 | Pass 2026-10-29 |
| FE-PAGE-08 | My purchases | Load error | Message + Try again | P1 | Pass 2026-10-29 |
| FE-PAGE-09 | Add purchase | Return "Window in days" 7, date 2026-10-27 | Preview "Return closes 3 Nov 2026 · in 7 days" | P0 | Pass 2026-10-29 |
| FE-PAGE-10 | Add purchase | Warranty 12 months from 2026-10-27 | Preview "Covered until 26 Oct 2027" | P0 | Pass 2026-10-29 |
| FE-PAGE-11 | Add purchase | Server 400 | ErrorSummary focused; inline errors; all entered values kept | P0 | Pass 2026-10-29 |
| FE-PAGE-12 | Edit purchase | Load existing | Fields prefilled; Save sends PATCH with changes | P0 | Pass 2026-10-29 |
| FE-PAGE-13 | Details | Data | Header facts, warranty and return panels with date, rule text, badge | P0 | Pass 2026-10-29 |
| FE-PAGE-14 | Details | No receipt | "Receipt missing" banner with Upload | P0 | Pass 2026-10-29 |
| FE-PAGE-15 | Details | Upload success | File appears in list; count updates | P0 | Pass 2026-10-29 |
| FE-PAGE-16 | Details | Upload 415 | Readable error; list unchanged | P0 | Pass 2026-10-29 |
| FE-PAGE-17 | Details | 404 | "Purchase not found" with link back | P0 | Pass 2026-10-29 |
| FE-PAGE-18 | Dashboard | Data | 4 counts; Needs action soonest first; Recently expired; Recent purchases | P0 | Pass 2026-10-29 |
| FE-PAGE-19 | Dashboard | Row click | Goes to that purchase's details | P0 | Pass 2026-10-29 |
| FE-PAGE-20 | Dashboard | New user | "Add your first purchase" empty state | P0 | Pass 2026-10-29 |
| FE-PAGE-21 | Dashboard | Count click | Opens My purchases with that filter | P1 | Pass 2026-10-29 |
| FE-PAGE-22 | Service dialog | Add valid | Record appears at the top of the history | P0 | Pass 2026-10-29 |
| FE-PAGE-23 | Service dialog | Invalid date | Inline error; dialog stays open | P0 | Pass 2026-10-29 |
| FE-PAGE-24 | Delete purchase | Confirm | DELETE sent; toast; back to My purchases | P0 | Pass 2026-10-29 |
| FE-PAGE-25 | Delete purchase | Cancel | Nothing sent | P0 | Pass 2026-10-29 |
| FE-PAGE-26 | Settings | Change return window to 3 | Preview sentence updates; Save → toast | P0 | Pass 2026-10-29 |
| FE-PAGE-27 | Settings | Out of range (0) | Inline error; Save blocked | P0 | Pass 2026-10-29 |
| FE-PAGE-28 | Settings | Sign out | Session cleared; at /login | P0 | Pass 2026-10-29 |
| FE-PAGE-29 | Search | Type + filter | Query sent; chips shown for active filters | P1 | Pass 2026-10-29 |
| FE-PAGE-30 | Search | Remove chip / Clear all | Filter removed; list refreshes | P1 | Pass 2026-10-29 |
| FE-PAGE-31 | Search | No results | Message names the filters + Clear filters | P1 | Pass 2026-10-29 |
| FE-PAGE-32 | Search | Filters in URL | Refresh keeps filters (vue-pinia skill: state-url-for-ephemeral-filters) | P1 | Pass 2026-10-29 |
| FE-PAGE-33 | AppShell | On a purchase's own page (`/purchases/:id`, `/purchases/new`) | "My purchases" is still the current nav item — the section stays marked on its sub-pages | P1 | Pass 2026-11-02 |
| FE-PAGE-34 | Details | Arrived from the Dashboard | Back link says Dashboard and returns there; a direct load or any other origin falls back to My purchases | P1 | Pass 2026-11-02 |
| FE-PAGE-35 | Search | Chip for a multi-value filter (`ACTIVE,EXPIRING_SOON`, as the Dashboard links it) | Chip reads "Return: Active or Expiring soon" — never a raw enum with underscores | P1 | Pass 2026-11-02 |
| FE-PAGE-36 | Settings | Alert window of 1 | Preview reads "1 day", not "1 days" | P2 | Pass 2026-11-02 |
| FE-PAGE-37 | Details | Category of a HOME_KITCHEN purchase | Header reads "Home & kitchen" — the label the form offered, never the stored value | P1 | Pass 2026-11-02 |
| FE-PAGE-38 | Details | "Keeping it" on an open return | PATCHes `returnClosed: true`; panel reads Closed and offers to reopen | P1 | Pass 2026-11-02 |
| FE-PAGE-39 | Details | Reopen on a closed return | PATCHes `returnClosed: false`; the countdown comes back | P1 | Pass 2026-11-02 |
| FE-PAGE-40 | Add purchase | "Starts on the purchase date" ticked | Warranty start follows the purchase date, including when that date is changed afterwards; the date field is not editable while ticked | P1 | Pass 2026-11-02 |
| FE-PAGE-41 | Edit purchase | Warranty start differs from the purchase date | Checkbox starts unticked and the entered start date is kept | P1 | Pass 2026-11-02 |
| FE-PAGE-42 | My purchases | Click anywhere in a table row | Opens that purchase; the name link still works on its own | P1 | Pass 2026-11-02 |
| FE-PAGE-43 | My purchases | Row menu (3 dots) | Offers View, Edit and Delete for that row; opening it does not navigate | P1 | Pass 2026-11-02 |
| FE-PAGE-44 | My purchases | Delete from the row menu | Asks first; on confirm sends DELETE and the row leaves the list | P1 | Pass 2026-11-02 |
| FE-PAGE-45 | Service dialog | Add a record with a next-service date | Sent on create; shown on the record and in the Service panel | P1 | Pass 2026-11-02 |
| FE-PAGE-46 | Settings | Service warning days | Third alert window, saved with the others | P1 | Pass 2026-11-02 |
| FE-PAGE-47 | Add purchase | Service fieldset | A next-service date can be set when the thing is bought, before any service exists | P1 | Pass 2026-11-02 |
| FE-PAGE-48 | Forgot password | Submit any address | Same confirmation whatever the answer — the page must not leak what the API hides | P0 | Pass 2026-11-02 |
| FE-PAGE-49 | Reset password | Valid token, matching passwords | POSTs token + password; lands on sign in with a confirmation | P0 | Pass 2026-11-02 |
| FE-PAGE-50 | Reset password | Passwords differ, or the link has no token | Inline mismatch error with nothing sent; a tokenless link says so instead of offering a form that can only fail | P0 | Pass 2026-11-02 |
| FE-PAGE-51 | Settings | Change password | Sends current + new; success toast; the fields clear | P0 | Pass 2026-11-02 |
| FE-PAGE-52 | Settings | New password and confirmation differ | Inline error, nothing sent | P0 | Pass 2026-11-02 |
| FE-PAGE-53 | Settings | Server refuses the current password | The error lands on that field, not as a sign-out | P0 | Pass 2026-11-02 |
| FE-PAGE-54 | Details | Service panel | Links down to the service history, so the panel that says a service is due reaches the place you log it | P1 | Pass 2026-11-02 |
| FE-PAGE-55 | AppShell | Account menu in the sidebar | Offers View profile, Change settings, Change password and Sign out; sign out still works from it | P1 | Pass 2026-11-02 |
| FE-PAGE-56 | Profile | Save a new name | PATCHes the name; the sidebar shows it without a reload | P1 | Pass 2026-11-02 |
| FE-PAGE-57 | Profile | Ask to change the email (BR-15) | Says to check the NEW address and that the current one still signs in — never that the address has changed | P0 | Pass 2026-11-02 |
| FE-PAGE-58 | Confirm email | Opening the link | Confirms on arrival, no button to press; a spent link says so | P0 | Pass 2026-11-02 |

---

## 5. End-to-end (`e2e/*.spec.ts`, Playwright)

| ID | Journey | Expected | Pri | Status |
| --- | --- | --- | --- | --- |
| E2E-01 | Register → empty dashboard | Account created; empty state visible | P0 | Pass 2026-10-29 |
| E2E-02 | Login (seed) → add purchase with 7-day return + 12-month warranty → save | Details show correct return deadline and warranty end | P0 | Pass 2026-10-29 |
| E2E-03 | Upload receipt.pdf on details → download | Downloaded file matches | P0 | Pass 2026-10-29 |
| E2E-04 | Add a service record | Appears in history after reload | P0 | Pass 2026-10-29 |
| E2E-05 | Dashboard shows an item due in ≤ 7 days | Listed in Needs action with days left | P0 | Pass 2026-10-29 |
| E2E-06 | Search "AirPods", edit seller | Found; change persists after reload | P1 | Pass 2026-10-29 |
| E2E-07 | Sign in as B, open A's purchase URL and receipt URL | Not-found page; no A data in network responses | P0 | Pass 2026-10-29 |
| E2E-08 | E2E-02 → 04 at a 390 × 844 viewport | Works; no horizontal scroll | P0 | Pass 2026-10-29 |

---

## 6. Seed (`apps/api/test/seed.e2e-spec.ts`)

| ID | Scenario | Expected | Pri | Status |
| --- | --- | --- | --- | --- |
| API-SEED-01 | Run seed on an empty DB | 2 users; demo user has 7 purchases; dashboard has 3 needs-action and 2 recently expired, relative to the real today | P0 | Pass 2026-10-29 |
| API-SEED-02 | Run seed twice | No duplicates (idempotent) | P1 | Pass 2026-10-29 |

---

## 7. Non-functional (manual checklist, Day 6 and Day 7)

From `design/ui-guide.md` §8 and the UI UX Pro Max pre-delivery checklist.

| ID | Check | How | Pri | Status |
| --- | --- | --- | --- | --- |
| NFR-01 | No horizontal scroll | Every page at 360, 768, 1024, 1440 px | P0 | Pass 2026-10-29 |
| NFR-02 | Text contrast ≥ 4.5:1, UI ≥ 3:1 | Browser devtools contrast check on badges, muted text, buttons | P0 | Pass 2026-10-29 |
| NFR-03 | Status never by colour alone | Every badge has an icon + words | P0 | Pass 2026-10-29 |
| NFR-04 | Keyboard only | Sign in → add purchase → upload → add service record with Tab/Enter/Esc | P0 | Pass 2026-10-29 |
| NFR-05 | Visible focus | Focus ring on every interactive element | P0 | Pass 2026-10-29 |
| NFR-06 | Labels | Every input has a visible label; errors linked via aria-describedby | P0 | Pass 2026-10-29 |
| NFR-07 | Touch targets | Buttons and inputs ≥ 44 px high on mobile | P1 | Pass 2026-10-29 |
| NFR-08 | Reduced motion | With prefers-reduced-motion, no transitions | P1 | Pass 2026-10-29 |
| NFR-09 | Page titles | `<title>` changes per route; one h1 per page | P1 | Pass 2026-10-29 |
| NFR-10 | Secrets | No secrets in git; `.env.example` complete; JWT secret required at boot | P0 | Pass 2026-10-29 |
| NFR-11 | Receipts not public | Guessing `/uploads/<key>` or any static path returns 404 | P0 | Pass 2026-10-29 |
| NFR-12 | Fresh clone | README steps alone run the app and all tests | P0 | Pass 2026-10-29 |
| NFR-13 | No control escapes its card | Every input, select and button sits inside its fieldset at 360, 768, 1024, 1440 px | P1 | Pass 2026-11-02 |
| NFR-14 | Row menu is never clipped | Open the menu on the last table row: all three items visible, inside the viewport | P1 | Pass 2026-11-02 |

> **NFR-12 run on 29 Oct 2026**, three times against clean clones of the committed tree. It found two defects that no other check in the project could have found, because every other check runs against the working tree:
>
> 1. **Critical** — `.gitignore` had a bare `storage/`, which matched `apps/api/src/common/storage/`. The whole storage module was uncommitted and a fresh clone could not build the API. Fixed in `41f010c`.
> 2. **Medium** — the README installed only `apps/api`, never mentioned the root or `apps/web` dependencies, and never said how to start the frontend. `docker-compose.yml` also pinned `container_name`, so a second checkout could not start. Fixed in `23ede49`.
>
> Re-verified after each fix: three installs clean, migrations applied, Vite 200, API `{"status":"ok","database":"up"}`.

---

## 8. Traceability

| Story / rule | Unit | API | Frontend | E2E | UAT |
| --- | --- | --- | --- | --- | --- |
| US-01 Register/login | — | API-AUTH-01→12 | FE-AUTH, FE-PAGE-01→03 | E2E-01 | UAT-01 |
| US-02 Manage purchase | — | API-PUR-01→27 | FE-PAGE-06→12, 24→25 | E2E-02, 06 | UAT-02, 07, 12 |
| US-03 Receipts | — | API-ATT-01→14, PUR-32 | FE-CMP-15, FE-PAGE-14→16 | E2E-03 | UAT-03, 11 |
| US-04 Return deadline | UT-DATE-08→16, 20 | API-PUR-02, 12, 19→20 | FE-PAGE-09, 13 | E2E-02 | UAT-04 |
| US-05 Warranty | UT-DATE-01→07, 17→19, 21 | API-PUR-02, 13→16, 25 | FE-PAGE-10, 13 | E2E-02 | UAT-04, 11 |
| US-06 Dashboard | — | API-DASH-01→08 | FE-PAGE-18→21 | E2E-05 | UAT-05 |
| US-07 Service history | — | API-SVC-01→10 | FE-PAGE-22→23 | E2E-04 | UAT-06 |
| US-08 Alert settings | UT-DATE-19 | API-SET-01→06, DASH-06 | FE-PAGE-26→27 | — | UAT-13 |
| US-09 Privacy | — | API-PUR-28→30, ATT-10→12, SVC-09→10, DASH-08, SRCH-10 | FE-API-03 | E2E-07 | UAT-08 |
| US-10 Search | — | API-SRCH-01→10 | FE-PAGE-29→32 | E2E-06 | UAT-07 |
| BR-05 Time zone | UT-DATE-22→24 | — | — | — | — |
| BR-08 Cascade | — | API-PUR-31 | — | — | UAT-12 |
| Error shape | — | API-ERR-01→05 | FE-API-02 | — | UAT-10 |

**Totals:** 24 unit · 99 API e2e · 58 frontend · 8 E2E · 12 NFR · 13 UAT.
