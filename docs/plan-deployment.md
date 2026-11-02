# Plan — deployment

**Status: planned, not built.** D-07 currently reads "local only via
docker-compose; no deployment". Shipping changes a locked decision, so it needs
a change-log entry when we do it.

---

## The short version

**Vercel is the right home for the web app and the wrong home for this API.**

The frontend is a static Vite build — Vercel is close to ideal and takes about
ten minutes. The API is a long-lived NestJS process that holds a connection
pool, runs a cron and writes files. Vercel runs serverless functions, which do
none of those three things. It is possible, but every one of them has to be
replaced.

| What the API does today | On a container host | On Vercel |
| --- | --- | --- |
| Cron at 08:00 (BR-16) | works unchanged | **does not run** — no live process |
| Writes receipts to disk (BR-10) | works with a volume | **lost between invocations** |
| TypeORM connection pool | works unchanged | needs a pooler, or it exhausts Postgres |
| Boot once, serve many | works unchanged | cold start per invocation |

---

## Recommended: Vercel for the web, a container host for the API

Vercel hosts `apps/web`. The API goes to **Railway, Render or Fly.io** — all
run a container, all have a free or near-free tier, and all keep the process
alive. Nothing in the API changes except configuration.

**What it takes**

1. **Postgres**: a managed instance (Neon, Supabase, or the host's own). Change
   `DATABASE_URL`, run `migration:run` once.
2. **Secrets, fresh**: `JWT_SECRET` generated for production with
   `openssl rand -base64 48` — never the development one. `BCRYPT_ROUNDS` 12.
3. **Email**: `SMTP_*` at a real provider (Brevo's 300/day is ample). Mailpit
   stays local. The first thing to verify after deploying is a password reset,
   because that is the flow that fails silently if SMTP is wrong.
4. **`APP_URL` and `WEB_ORIGIN`**: the real domains. These are not cosmetic —
   `WEB_ORIGIN` is the CORS allow-list, and `APP_URL` is what reset links are
   built from.
5. **Uploads**: a mounted volume for `UPLOAD_DIR`, or object storage (below).
6. **Vercel rewrite**: `/api/*` → the API's domain, so the browser keeps seeing
   one origin and the session cookie stays first-party (D-04). Without this the
   cookie becomes cross-site and `SameSite=Lax` stops sending it.
7. **CI**: it already exists and has never run. The push is what starts it.

Roughly half a day, most of it waiting for DNS.

---

## If it must be Vercel for both

Four changes, none of them hacks, but all of them real work.

**1. The cron becomes an HTTP endpoint (~1h).** Vercel Cron calls a URL on a
schedule rather than keeping a process alive. The work is already separable —
`RemindersService.sendDue()` has no schedule in it, which is why
`npm run reminders:send` exists — so this is a thin controller:

```
POST /internal/reminders/run    guarded by a shared secret header
vercel.json: { "crons": [{ "path": "/api/v1/internal/reminders/run", "schedule": "30 2 * * *" }] }
```

Vercel's schedules are UTC, so 08:00 Asia/Kolkata is `30 2 * * *`. The endpoint
must be `@Public()` **and** secret-guarded, and must refuse a request without
the secret — otherwise anyone can trigger everyone's email.

**2. Receipts move to object storage (~2h).** Serverless filesystems are
ephemeral; a file written on one invocation is gone on the next. This is the
one place the existing design pays off: storage is already behind a `STORAGE`
token with a `Storage` interface, so it is a new class
(`S3Storage` / Vercel Blob) and a provider swap, not a refactor. BR-10's
check-before-write still holds because the signature check happens on the
in-memory buffer before anything is stored.

**3. Connection pooling (~1h).** Every warm function keeps its own pool; a few
dozen concurrent invocations exhaust a small Postgres. Needs a pooled endpoint
(Neon or Supabase both offer one) and `extra: { max: 1 }` on the DataSource.

**4. Cold starts (~1h).** A full Nest bootstrap per invocation is 1–3 seconds.
The standard fix is caching the bootstrapped app across invocations in module
scope, so only the first request in a warm container pays.

Roughly a day and a half, and it leaves three things permanently more fragile
than the container version.

---

## Either way, before shipping

- **`synchronize: false` is already set everywhere** — migrations only, nothing
  to change.
- **Generate a new `JWT_SECRET`.** Reusing the development one means every
  session cookie ever issued locally is valid in production.
- **Set `NODE_ENV=production`**, which is what turns on `secure` cookies.
- **Seed nothing.** `npm run seed` creates `demo@proofly.test` with a published
  password. It is idempotent and harmless locally; in production it is an
  account anyone can read about in this repository.
- **Rate limiting** (`security.md` §8) matters much more once the reset
  endpoint is reachable from the internet. It is the first thing I would add
  after deploying, and it is listed as not built.
- **Back up before the first real user.** There is no backup procedure yet —
  `CHANGELOG.md` lists it under operational gaps.

---

## Order

1. **Push to Gitea.** Nothing is backed up anywhere but this disk, and CI has
   never executed. This is the highest-value step and the only one where the
   risk is losing the work.
2. **Run UAT** (`docs/uat-report.md`) and fix whatever it finds.
3. **Tag `v1.0.0`** — a deployment wants something to point at.
4. **Deploy.**

Deploying before 1 and 2 means debugging in production something a local run
would have caught in ten minutes.
