# Deploying the web app to Vercel

Root directory **`apps/web`** — set it in Vercel's project settings, since this
is a monorepo and the repository root holds no web app.

Also set **Production Branch = `master`** (Settings → Git). Vercel defaults to
the repository's default branch, which on the GitHub mirror is `main` and holds
only a generated README.

Everything else comes from `vercel.json` beside this file; the build settings
there (`vite`, `npm run build`, `dist`) should not be overridden in the
dashboard.

## 1. The rewrite — already pointed at the API

`vercel.json` rewrites `/api/*` to `purchase-tracker-api.onrender.com`, which
is the live API. Nothing to fill in; change it only if the API is ever renamed
or moved.

**This rewrite is not a convenience.** It keeps the browser talking to one
origin, which is what keeps the session cookie first-party (D-04). Point the
frontend straight at the API's domain instead and the cookie becomes
cross-site, `SameSite=Lax` stops sending it, and every navigation looks like
being signed out.

The SPA rule below it (`/(.*)` → `/index.html`) must stay **after** the API
rule, or `/api/...` would be answered with the HTML page. Order is the whole
behaviour here.

## 2. The cron is NOT here

`vercel.json` has no `crons` block, deliberately. Vercel's scheduler cannot
reach this endpoint:

- it issues a **GET**, and the endpoint is a `POST`;
- it cannot send a custom header, and the guard requires `x-cron-secret`
  (Vercel sends its own `Authorization: Bearer`, which the API does not read);
- it only invokes **Vercel Functions**, never a rewrite to another host — and
  this project is a static SPA with no functions.

Verified against the running API: a GET to that path returns 404.

BR-16's daily digest is scheduled by `.github/workflows/reminders.yml`
instead, which can send a POST with an arbitrary header. It needs two
repository secrets, `API_BASE_URL` and `CRON_SECRET`, the latter matching the
value Render generated.

Set no `CRON_SECRET` in Vercel — nothing here uses it.

## 3. Checking it worked

- The sign-in page loads.
- In the network tab, `/api/v1/auth/me` goes to **your own origin**, not the
  API's. If it goes to the API's domain, the rewrite is wrong and sessions
  will not stick.
- A deep link such as `/purchases/<id>` loads instead of 404ing — that is the
  SPA rewrite doing its job.
