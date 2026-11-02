# Proofly — Security

What is defended, how, and which test proves it. Proofly stores receipts, prices
and warranty dates — low-sensitivity data that is nonetheless **private per user**,
so the properties that matter are *authentication*, *ownership isolation* and
*safe file handling*.

Scope: a locally run MVP (D-07). §8 lists what a deployed version would need.

---

## 1. Authentication

| | |
| --- | --- |
| Passwords | bcrypt, cost from config. Plaintext is never logged and `passwordHash` never leaves a response DTO |
| Token | JWT, payload is `sub` only — no email, no settings, nothing that goes stale |
| Transport | `httpOnly: true`, `sameSite: 'lax'`, `secure` in production, `maxAge` from `JWT_EXPIRES_IN` |
| Verification | The guard re-reads the user on every request; a deleted account's token stops working immediately |

**Why a cookie and not `Authorization`** (D-04): an httpOnly cookie cannot be read
by any script, so an XSS bug cannot exfiltrate the session. The cost is CSRF
exposure, answered by `SameSite=Lax` plus a credentialed CORS policy pinned to one
exact origin (`WEB_ORIGIN`) — a wildcard is not even possible with credentials.
Every state-changing route is POST/PATCH/DELETE, which `Lax` does not send
cross-site.

**Login does not reveal whether an email exists.** A wrong email and a wrong
password return the same `401` — and `AuthService` compares against a real bcrypt
hash even when no user matched, so the two paths take the same time:

```ts
// apps/api/src/auth/auth.service.ts
await bcrypt.compare(password, ABSENT_USER_HASH);
```

`LoginDto` also carries no length or pattern rules on purpose: telling someone
their attempt was "too short to be a password here" is a hint.

**Proven by:** `API-AUTH-01…12` — register 201 + cookie, duplicate email 409, bad
login 401 **with no cookie set**, `/auth/me`, logout clears the cookie, and every
data endpoint 401 without one.

---

## 2. Authorization — the ownership boundary

The only authorization rule in Proofly: **you see your own rows and nobody else's.**

It is enforced in the `WHERE` clause, not in a check that a caller could forget:

```ts
// apps/api/src/repositories/purchase/purchase.repository.ts:20
where: { id, userId }
```

Every repository method takes `userId`. There is no method that does not, so
"forgot the ownership check" is not a mistake this code can make.

**Not found is 404, never 403** (BR-09). A 403 confirms the record exists, which
is exactly what a stranger with a guessed UUID should not learn.

This reaches further than the obvious routes. Attachments and service records are
addressed by *their own* id (`/attachments/:id`), so each one re-joins to the
owning purchase and back to `userId` before anything is returned or streamed.

**Proven by:** ten A-vs-B cases across read, list, update, delete, upload,
download, search and the dashboard, plus `E2E-07` — user B pasting user A's
purchase URL in a real browser.

---

## 3. Input validation

A global `ValidationPipe` with **`whitelist` and `forbidNonWhitelisted`**: an
undeclared field is a `400`, not a silently ignored one. `{ "isAdmin": true }`
cannot ride along with a legitimate update.

`UpdatePurchaseDto` is deliberately **not** `PartialType(CreatePurchaseDto)` — that
would inherit whatever the create DTO gains later, including fields that must not
be patchable.

Every `:id` goes through `ParseUUIDPipe`, so a malformed id is a 400 before it
reaches a query. TypeORM parameterises everything; there is no string-built SQL
anywhere in the codebase.

**Proven by:** the §7 validation table plus `API-ERR-01…06`.

---

## 4. File uploads

The highest-risk surface, so BR-10 is layered:

1. **MIME *and* magic bytes must agree.** MIME alone is whatever the client said —
   a text file renamed `receipt.pdf` arrives as `application/pdf`. Only the first
   bytes disagree.
   ```ts
   // apps/api/src/common/files/signatures.ts
   export function isAcceptableUpload(declaredMimeType: string, bytes: Buffer) {
     if (!ALLOWED_MIME_TYPES.includes(declaredMimeType)) return false;
     return detectMimeType(bytes) === declaredMimeType;   // PDF, JPEG, PNG, WEBP
   }
   ```
2. **≤ 5 MB** → 413. **≤ 5 files per purchase** → 400.
3. **Nothing is written on rejection.** The check runs on the in-memory buffer
   before any write, so a rejected upload leaves the storage directory *empty* —
   not "written then cleaned up". (See `docs/decisions.md` for why in-memory.)
4. **Random storage keys**, `randomBytes(16)`, mode `0600`, in a directory outside
   any statically served path. The original filename is kept in the database for
   `Content-Disposition` and never used as a path.
5. **Path traversal is structurally impossible:** `basename()` strips any
   separator before the path is resolved, so a tampered key cannot escape the
   directory.
   ```ts
   // apps/api/src/common/storage/local-disk.storage.ts:47
   private pathFor(key: string) { return resolve(this.baseDir, basename(key)); }
   ```
6. **Downloads stream only to the owner** — the same §2 join. `storageKey` is
   excluded from every response DTO; it is how a file is found, and no client
   needs it.

**Proven by:** `API-ATT-01…12`, including the three that assert the directory is
untouched after a rejection.

---

## 5. Output

No endpoint returns an entity. Each maps to a response DTO, which is why
`passwordHash` and `storageKey` cannot leak by someone adding a column.

The exception filter returns `{ error: { code, message, fields? } }` for
everything. An unrecognised error becomes `500 INTERNAL` with **no stack trace and
no message detail** — database errors in particular often carry table and column
names.

The frontend never uses `v-html`. Vue escapes interpolation, so a product name of
`<script>alert(1)</script>` renders as text — and the httpOnly cookie means even a
successful injection could not read the session.

---

## 6. Configuration

`@nestjs/config` validates the environment at boot and **refuses to start** on a
missing `DATABASE_URL` or a weak secret:

```
JWT_SECRET must be at least 32 characters. Generate one with: openssl rand -base64 48
```

A bad default is worse than a crash: the crash happens on line one, the default
surfaces as a security hole in production. `.env` is git-ignored; `.env.example`
carries placeholders only. No secret appears in any committed file.

---

## 7. Database

`synchronize: false` in **every** environment, including development — it alters
schemas behind the migrations' back, and dev drifting from migrations is the bug
`db-use-migrations` exists to prevent. Schema changes only ever arrive as a
reviewed migration file.

`ON DELETE CASCADE` on both foreign keys means a deleted purchase cannot leave
another user's view of the data inconsistent, and the delete is one atomic
statement.

---

## 8. Known gaps

Honest list. None blocks the MVP; all are deliberate.

| Gap | Why it is acceptable now | What production needs |
| --- | --- | --- |
| ~~No rate limiting~~ — **done** | `@nestjs/throttler` on `/auth/*`: 5 attempts per address per minute by default (`THROTTLE_AUTH_LIMIT`). Applied to those routes only, so an ordinary session is not refused because someone else on the same network is guessing passwords | A shared store (Redis) once there is more than one instance — the counter is per-process |
| **No security headers** (`helmet`) | Served by Vite dev over `http://localhost` | `helmet()` with a CSP, and HSTS behind TLS |
| **No CSRF token** | `SameSite=Lax` + one pinned origin covers the MVP | A double-submit token once the API is on a different origin |
| **No audit log** | No multi-user or compliance requirement | Append-only log of auth events and deletions |
| **Uploads held in memory** | Bounded by the 5 MB cap; required for check-before-write | A streaming signature check |
| **Files are not encrypted at rest** | Local disk, `0600`, single user | Disk encryption or an object store with SSE |
| **No password reset** | P2 in `requirements.md` §4 | Single-use expiring token over email |
| **No TLS** | Local only (D-07) | TLS terminated at the proxy; `secure` cookies already switch on in production |

---

## 9. Dependency hygiene

**`npm audit --omit=dev` reports 0 vulnerabilities in both apps.** Getting there
took two pinned overrides in `apps/api/package.json`, because NestJS 11 pins both
packages to an exact vulnerable version and the published "fix" is NestJS 12 —
which is ESM-only and would not load in this CommonJS API:

```json
"overrides": { "multer": "2.5.0", "js-yaml": "5.4.3" }
```

| Advisory | Severity | Reachable here? |
| --- | --- | --- |
| `multer` DoS via a pending async `fileFilter` ([GHSA-q7qp-rjg7-q26m](https://github.com/advisories/GHSA-q7qp-rjg7-q26m)) | High | **No** — the upload interceptor passes only `storage` and `limits`; there is no `fileFilter` at all |
| `js-yaml` CPU use on empty merge sources ([GHSA-r3ph-w7gj-g6xm](https://github.com/advisories/GHSA-r3ph-w7gj-g6xm)) | Moderate | **No** — `@nestjs/swagger` only *writes* our own OpenAPI document; no untrusted YAML is ever parsed |

Both were patched regardless: "not reachable today" is a property of the current
code, not of the next change. The full API suite — 25 unit and 107 e2e, including
all twelve `API-ATT` upload cases — passes on the overridden versions.

**Remaining findings are development-only** and never ship: 9 low in the API
(`jest`, `@nestjs/cli` and their shared chain) and 2 in the web app (`vitest`'s
`tinypool` and `@vitest/mocker`). Both would need a major test-runner upgrade
mid-delivery; they are recorded here rather than rushed in. They run only on a
developer's machine against this repo's own code.

Dependencies are pinned by the lockfile, and `npm ci` — not `npm install` — is what
CI and the clean-setup check (`NFR-12`) run, so a fresh build cannot silently pick
up a new transitive version.
