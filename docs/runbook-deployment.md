# Runbook — from here to live

Every step, in order, with who does it and roughly how long. Nothing here is
built yet; this is the list.

**Two things to know before you start.**

**1. Vercel cannot deploy from your Gitea.** Vercel's Git integration supports
GitHub, GitLab and Bitbucket only — a self-hosted Gitea is not one of them.
Railway is GitHub-only too. There are two ways round it:

| | Push-to-deploy | CI runs | Effort |
| --- | --- | --- | --- |
| **Mirror to a private GitHub repo** (recommended) | yes | yes — `ci.yml` is already a GitHub Actions workflow and has never run | 10 min |
| Deploy from your machine with the Vercel/Railway CLIs | no | no | 0 min, but every release is manual |

Gitea stays the place you push; GitHub becomes a mirror that exists so robots
can read it. One extra `git push` per release, or a `git remote` that pushes to
both at once.

**2. `migration:run` will not work in production as written.** It is
`dotenv -e ../../.env -- …`, and a deployed container has no `.env` — its
environment comes from the platform. It needs a sibling script that reads
`process.env` directly. Small, but it is the step that would fail first.

---

## Phase 0 — Accounts (you, ~15 min)

Free tiers are enough for all four.

| Service | For | Note |
| --- | --- | --- |
| **GitHub** | the deployment mirror, and CI | Private repo is fine |
| **Neon** or **Supabase** | Postgres | Both give a pooled connection string, which is what to use |
| **Railway** or **Render** | the API container | Needs to keep a process alive — that is why not Vercel |
| **Brevo** | SMTP | 300/day free, no domain needed to start |
| **Vercel** | the web app | |

---

## Phase 1 — Code changes before anything is deployed (me, ~3h)

These are real changes, each with tests.

1. **A production migration script** (~15 min). `migration:run:prod` reading
   `process.env`, run as the release command so the schema is applied before
   the new version serves traffic.
2. **Rate limiting** (~1h). `@nestjs/throttler` on `/auth/*`: 3 reset requests
   per hour, tight limits on login and register. This is listed as a gap in
   `security.md` §8 and it stops mattering theoretically the moment the reset
   endpoint is reachable from the internet — it sends mail to an address an
   anonymous caller chooses.
3. **A Dockerfile for the API** (~45 min). Multi-stage, `npm ci`, build, prune
   to production dependencies, non-root user, `node dist/main`. Predictable
   beats letting a platform guess at a workspace monorepo.
4. **`vercel.json` for the web** (~30 min). SPA rewrite so a deep link like
   `/purchases/abc` serves `index.html`, and `/api/*` proxied to the API's
   domain. **The proxy is not optional**: it keeps the browser on one origin,
   which is what keeps the session cookie first-party (D-04). Without it the
   cookie is cross-site and `SameSite=Lax` stops sending it — everyone is
   logged out on every navigation.
5. **A health check the platform can use** (~5 min). `/api/v1/health` already
   exists and reports the database; just point the platform at it.
6. **Record the change to D-07** (~10 min). "Local only, no deployment" stops
   being true, so it gets a change-log entry like every other locked decision.

---

## Phase 2 — Mirror and CI (me + you, ~20 min)

```bash
# you: create an empty private repo on GitHub, then
git remote add github git@github.com:<you>/purchase-tracker.git
git push github master --tags
```

Watch the Actions tab. **This is the first time CI has ever run**, and it is
worth watching rather than assuming: it does `npm ci` on a clean checkout,
which is exactly the check that caught the `.gitignore` defect (D-01).

Fix whatever it finds before going further. A clean machine fails differently
from yours.

---

## Phase 3 — Database (me + you, ~20 min)

1. You create the Postgres instance and copy the **pooled** connection string.
2. I set `DATABASE_URL` on the API host and run the migrations once.
3. Verify: `/api/v1/health` returns `{"status":"ok","database":"up"}`.

**Do not run the seed.** `npm run seed` creates `demo@proofly.test` with a
password published in this repository. It is useful locally and an open door
in production.

---

## Phase 4 — Deploy the API (me, ~45 min)

Environment, all set on the host, none of it in the repo:

```
NODE_ENV=production          # this is what turns on `secure` cookies
DATABASE_URL=…               # the pooled string
JWT_SECRET=…                 # openssl rand -base64 48 — NEW, never the dev one
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
APP_TIMEZONE=Asia/Kolkata
UPLOAD_DIR=/data/uploads     # a mounted volume, not the container filesystem
WEB_ORIGIN=https://<your-vercel-domain>
APP_URL=https://<your-vercel-domain>
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=…
SMTP_PASS=…
MAIL_FROM=Purchase Tracker <no-reply@…>
```

**`UPLOAD_DIR` must be a mounted volume.** A container filesystem is thrown
away on every deploy; receipts written there vanish with it.

**`WEB_ORIGIN` and `APP_URL` are not cosmetic.** The first is the CORS
allow-list, the second is what password-reset links are built from — pointing
it at the wrong host makes every reset link useless.

Verify: `/api/v1/health`, then `/api/v1/docs`.

---

## Phase 5 — Deploy the web (me, ~30 min)

Vercel, root `apps/web`, build `npm run build`, output `dist`. Add the rewrite
to the API domain. Then a custom domain if you want one, which is the slow part
because of DNS.

Verify: the sign-in page loads, and the browser's network tab shows
`/api/v1/auth/me` going to **your own origin**, not the API's. If it goes to
the API's domain directly, the rewrite is wrong and sessions will not stick.

---

## Phase 6 — Smoke test, live (you + me, ~30 min)

In this order, because each one fails differently:

1. **Register a real account.** Not the demo one.
2. **Add a purchase, upload a receipt, reload, download it.** This proves the
   volume is mounted — it is the step that silently fails if it is not.
3. **Sign out, forgot password, follow the link from your inbox.** The first
   thing that goes wrong with a real SMTP provider, and it fails quietly:
   sending is best-effort by design, so a misconfigured provider looks like
   nothing happening.
4. **Change the email address and confirm it.** Second mail path.
5. **Open a purchase on a phone.**
6. `npm run reminders:send` against production **once**, to prove the digest
   works before the cron first fires at 08:00.

---

## Phase 7 — After it is live (me, ~1h, plus your decisions)

- **Backups.** The managed Postgres has them; turn them on and write down how
  to restore. `CHANGELOG.md` lists "no backup procedure" as an open gap and it
  stops being acceptable the moment there is a real user.
- **Uptime check** on `/api/v1/health`.
- **Watch the first cron**, 08:00 Asia/Kolkata the morning after.
- **Error reporting** — Sentry's free tier, or the platform's logs if you would
  rather not add a dependency.

---

## Honest total

| Phase | Who | Time |
| --- | --- | --- |
| 0 accounts | you | 15 min |
| 1 code changes | me | ~3h |
| 2 mirror + CI | both | 20 min + fixing whatever CI finds |
| 3 database | both | 20 min |
| 4 API | me | 45 min |
| 5 web | me | 30 min + DNS |
| 6 smoke test | both | 30 min |
| 7 after | me | 1h |

**About a day**, assuming CI finds nothing surprising. The two places it
usually goes long are DNS propagation and the first real SMTP send.

## What is deliberately not in this plan

- **Extended warranties** — designed, deferred, in `CHANGELOG.md`.
- **The response-mapping interceptor** — worth doing, but it touches every
  controller and would be a poor thing to be mid-way through during a first
  deployment.
- **Object storage for receipts** — a mounted volume is simpler and enough at
  this size. The `STORAGE` token means swapping to S3 later is a new class, not
  a refactor.
