# Runbook — from here to live

Every step, in order, with who does it and roughly how long.

**Phases 0–3 are done. Phase 1's code is written and verified against a real
container.** What is left is Phase 4 (Render) and Phase 5 (Vercel), which are
both dashboard work, plus the Phase 6 smoke test.

**Two things to know before you start.**

**1. Vercel cannot deploy from your Gitea.** Vercel's Git integration supports
GitHub, GitLab and Bitbucket only — a self-hosted Gitea is not one of them.
Railway is GitHub-only too. There are two ways round it:

| | Push-to-deploy | CI runs | Effort |
| --- | --- | --- | --- |
| **Mirror to a private GitHub repo** (recommended) | yes | yes — `ci.yml` is already a GitHub Actions workflow | 10 min |
| Deploy from your machine with the Vercel/Railway CLIs | no | no | 0 min, but every release is manual |

Gitea stays the place you push; GitHub becomes a mirror that exists so robots
can read it. One extra `git push` per release, or a `git remote` that pushes to
both at once.

**2. The free tier shapes three things.** Verified against Render's docs, not
assumed:

| Free instance cannot | Consequence | What was done |
| --- | --- | --- |
| attach a persistent disk | receipts die on every restart / 15-min spin-down | accepted and recorded in `CHANGELOG.md` (BR-10) |
| run a pre-deploy command | the schema would never be applied | migrations moved into the container's start command |
| run Render cron jobs | BR-16's daily digest never fires | moved to `.github/workflows/reminders.yml` |

Vercel's own cron could not do the digest either: it sends a **GET**, cannot
send a custom header, and only invokes Vercel Functions — while the endpoint is
a `POST` guarded by `x-cron-secret`. Confirmed by hand against the container: a
GET returns 404.

---

## Phase 0 — Accounts (you) — **done, except two keys**

| Service | For | Status |
| --- | --- | --- |
| **GitHub** | deployment mirror + CI | **done.** `Winston-Vivek/Purchase_Pal`, SSH key working, `master` and `v1.0.0` pushed |
| **Neon** | Postgres | **done.** Project `soft-king-41645725`, branch `production`, Postgres 18.6, 7 migrations applied, 0 users |
| **Render** | the API container | account ready (`winston.vivek@rubicotech.in`); unblocked — the mirror exists |
| **Brevo** | SMTP | **done.** Host, port, login and SMTP key held in the untracked `.env` |
| **Vercel** | the web app | account ready (`winston.vivek@rubicotech.in`) |

**Neon notes.** Use the **pooled** endpoint, not the direct one: an instance
allowed to sleep reconnects often, and the pooler is what keeps that from
exhausting connections. `DATABASE_SSL=true`, with certificates verified —
turning verification off would make the encryption decorative.

The Neon **serverless driver was deliberately not adopted.** It is for edge
runtimes talking over HTTP; this is a long-lived Node container, where plain
`pg` against the pooler is both correct and faster. No application code
changed to use Neon.

## Phase 1 — Code changes before anything is deployed (me) — **done**

All six landed. The container was then built and run against an empty database
to prove it: 7/7 migrations applied by the start command, `/api/v1/health`
returned `{"status":"ok","database":"up"}`, `/api/docs` correctly 404'd, and the
reminders endpoint answered 401 / 404 / 200 to no-secret / GET / correct-POST.

1. **A production migration script.** `migration:run:prod` reads `process.env`,
   and runs from the container's `CMD` — *not* as a pre-deploy command, which
   is a paid feature. It is idempotent, so running it on every cold start is
   free after the first.
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

**The push is done** — the mirror holds `master` and the `v1.0.0` tag.

What is *not* confirmed is CI. Open the Actions tab and look: the workflow does
`npm ci` on a clean checkout, which is exactly the check that caught the
`.gitignore` defect (D-01). A clean machine fails differently from yours, so fix
whatever it finds before going further.

Two repository **secrets** are needed for the reminders workflow (Settings →
Secrets and variables → Actions):

| Secret | Value |
| --- | --- |
| `API_BASE_URL` | the Render URL, e.g. `https://purchase-tracker-api.onrender.com` |
| `CRON_SECRET` | the exact `CRON_SECRET` Render generated — copy it from Render's dashboard |

---

## Phase 3 — Database (me + you, ~20 min)

**Done.** Neon project `soft-king-41645725`, branch `production`, 7 migrations
applied, 0 users. Use the **pooled** connection string as `DATABASE_URL`, and
keep `DATABASE_SSL=true`.

The container now applies migrations itself on boot, so there is nothing to run
by hand for the next schema change — deploying is enough.

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
UPLOAD_DIR=/data/uploads     # EPHEMERAL on free — no disk can be attached
WEB_ORIGIN=https://<your-vercel-domain>
APP_URL=https://<your-vercel-domain>
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=…
SMTP_PASS=…
MAIL_FROM=Purchase Tracker <no-reply@…>
```

**`UPLOAD_DIR` is ephemeral here, and that is a known limitation.** A free
instance cannot attach a disk, so receipts live only until the next redeploy,
restart or 15-minute spin-down. Recorded in `CHANGELOG.md` against BR-10. The
fix, when it matters, is `plan: starter` plus the `disk:` block that
`render.yaml` still documents in a comment.

**Both platforms default to the wrong branch.** The mirror's default branch is
`main`, which holds only the README that GitHub generated when the repository
was created; the code is on `master`. `render.yaml` now pins `branch: master`,
but **Vercel has to be told separately** — Settings → Git → Production Branch =
`master`. The tidier alternative is to change the repository's default branch to
`master` on GitHub and delete `main`, after which neither platform can get it
wrong.

**Most of this is already in `render.yaml`.** Create the service from the
blueprint (Render → New → Blueprint) rather than filling in a form, and only
the five `sync: false` values need typing: `DATABASE_URL`, `WEB_ORIGIN`,
`APP_URL`, `SMTP_PASS`, `MAIL_FROM`. `JWT_SECRET` and `CRON_SECRET` are
generated by Render and should never be seen or copied from the dev ones.

**Chicken and egg:** `WEB_ORIGIN` and `APP_URL` need the Vercel domain, which
does not exist until Phase 5. Deploy the API first with placeholders, then come
back and set them. The API will not serve the browser correctly until you do.

**`WEB_ORIGIN` and `APP_URL` are not cosmetic.** The first is the CORS
allow-list, the second is what password-reset links are built from — pointing
it at the wrong host makes every reset link useless.

Verify: `/api/v1/health` returns `{"status":"ok","database":"up"}`.

**Not** `/api/v1/docs` — Swagger is deliberately not mounted when
`NODE_ENV=production` (`main.ts`), so a 404 there is the correct answer. The
startup log still prints an "API docs at …" line regardless; it is wrong in
production and harmless.

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
6. **Trigger the reminders workflow by hand** — Actions → *Daily reminders* →
   Run workflow — to prove the digest works before 08:00 comes round. It prints
   the HTTP status and body, and it tells a 401 (mismatched secret) apart from
   a quiet `{"users":0,"reminders":0}`, which is the distinction that otherwise
   looks identical to success.

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
