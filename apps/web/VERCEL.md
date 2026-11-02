# Deploying the web app to Vercel

Root directory **`apps/web`**. Everything else is in `vercel.json` beside this
file, with two things to fill in.

## 1. Point the rewrite at the API

Replace `REPLACE-WITH-API-HOST` in `vercel.json` with the API's domain, for
example `purchase-tracker-api.onrender.com`.

**This rewrite is not a convenience.** It keeps the browser talking to one
origin, which is what keeps the session cookie first-party (D-04). Point the
frontend straight at the API's domain instead and the cookie becomes
cross-site, `SameSite=Lax` stops sending it, and every navigation looks like
being signed out.

The SPA rule below it (`/(.*)` → `/index.html`) must stay **after** the API
rule, or `/api/...` would be answered with the HTML page. Order is the whole
behaviour here.

## 2. The cron

`crons` calls the reminder endpoint daily. **Vercel's schedules are UTC**, so
`30 2 * * *` is 08:00 Asia/Kolkata — the app's own zone (D-10).

Set `CRON_SECRET` in the Vercel project environment to the same value the API
has. Vercel sends it as `Authorization: Bearer <CRON_SECRET>`; the API expects
`x-cron-secret`, so add a header to the rewrite or front the call with a tiny
route — whichever, **the API refuses an unsigned call**, which is the point.

Without the secret, that endpoint would let anyone make the server email every
user.

## 3. Checking it worked

- The sign-in page loads.
- In the network tab, `/api/v1/auth/me` goes to **your own origin**, not the
  API's. If it goes to the API's domain, the rewrite is wrong and sessions
  will not stick.
- A deep link such as `/purchases/<id>` loads instead of 404ing — that is the
  SPA rewrite doing its job.
