# Proofly — 5-minute demo script

Seeded data, one browser, no slides. Timings are a budget, not a target — if you
overrun, drop §5 (search) before anything else.

---

## Before you start

```bash
docker compose up -d                       # Postgres on 5434
npm --prefix apps/api run migration:run
npm --prefix apps/api run seed             # resets to 7 purchases, dated from today
npm --prefix apps/api run start:dev        # terminal 1
npm --prefix apps/web run dev              # terminal 2
```

- **Re-run the seed on the morning of the demo.** Dates are stored relative to the
  day it ran, so yesterday's seed shows an expired warranty where you wanted one
  that is live.
- Sign in as `demo@proofly.test` / `demo1234` **beforehand**, then sign out — so the
  browser has the password saved and you are not typing it on camera.
- Have a small PDF on the desktop named something obvious, e.g. `invoice.pdf`.
- Second browser profile or an incognito window open, for §6.
- Zoom the browser to 110%. Close the dev tools.

---

## 0:00 — The problem (30 s)

> "You buy a laptop. Fourteen days to return it, a year of warranty. The invoice is
> in your email, the warranty card is in a drawer, and the date is nowhere. Six
> months later something breaks and you cannot prove when you bought it.
>
> Proofly is the record: what you bought, when, the proof, and how long you are
> still covered."

Don't open the app yet. Say this to the audience.

---

## 0:30 — Dashboard (60 s)

Sign in → lands on `/dashboard`.

> "Everything is here in one screen."

Point at, in order:

1. **The four counts** — 7 purchases, 4 under warranty, 2 open returns, 2 need action.
2. **Needs action** — Nike Pegasus 41, return in **3 days**; AirPods Pro, **6 days**.
   Soonest first.
   > "This is the whole product. These two are about to run out and nothing else is."
3. **A status badge** — "Expiring soon" is an icon, the words, *and* the colour.
   > "Never colour alone — that would be invisible to a colour-blind user."
4. **Recently expired** — the Samsung AC warranty ran out yesterday.
   > "It stays visible for 30 days, because 'I just missed it' is still useful to know."

---

## 1:30 — Add a purchase, and the dates (75 s)

**Add purchase** → fill in:

| | |
| --- | --- |
| Product | `Sony WH-1000XM5` |
| Category | Electronics |
| Price | `29990` |
| Purchase date | today |
| Return window | `7` days |
| Warranty start | today · **12** months |

**Stop before saving.** Point at the two preview lines under the fields.

> "It already tells me the return closes on <date> and the warranty ends on <date>,
> before I have saved anything. That's the feature people actually want, and it is
> why the date rules run in the browser as well as on the server — both sides are
> pinned to the same test table so they cannot drift."

Save → the details page opens.

> "Twelve months from today is not 'the same date next year'. It is the day *before*
> that — a year of cover, inclusive. And if you buy on the 31st of January, a
> one-month warranty ends on the 28th of February, because there is no 31st. Those
> two rules have twenty-four unit tests between them."

---

## 2:45 — The receipt (45 s)

On the new purchase: **Upload** → pick `invoice.pdf`.

> "This is the proof. It is stored outside any public folder under a random name,
> and it only streams back to the person who owns it."

Then, if you have 15 seconds spare, rename a `.txt` to `.pdf` and try it:

> "Rejected. The content type said PDF — but we also read the first four bytes, and
> they weren't `%PDF`. Nothing was written to disk."

---

## 3:30 — Service history (30 s)

Open **iPhone 15** → **Add service record**: today, "Screen replacement", ₹8,500.

> "Repairs live with the product, newest first. When you sell it, this is the
> history. When you claim warranty, this is the evidence."

---

## 4:00 — Settings change the picture (30 s)

**Settings** → return warning `7` → `3` → Save → back to **Dashboard**.

> "AirPods just left 'Needs action'. Nothing about the purchase changed — I did.
>
> That's why status is never stored in the database. It is computed per response,
> against *your* alert window. The same row is 'expiring soon' for me and 'active'
> for you."

Set it back to 7.

---

## 4:30 — Privacy (30 s)

Copy the URL of any purchase. Open the incognito window, sign in as
`other@proofly.test` / `demo1234`, paste the URL.

> "Not found. Not 'forbidden' — **not found**. 'Forbidden' would confirm the record
> exists, and that is the one thing a stranger shouldn't learn.
>
> It isn't a check someone remembered to write. Every database query takes the user
> id as a parameter; there is no method that doesn't."

**End here.** Last line:

> "Seven days: requirements, design, a tested backend, a tested frontend, and a
> gate that refuses to let a phase close until every test case in the plan has a
> passing test with its ID in the name. 289 tests."

---

## If you are asked for more

| Question | Where to go |
| --- | --- |
| "Show me the tests" | `npm run gate day6` — it reads `git log` and fails if a feature was committed before its test |
| "How do you know the dates are right?" | `apps/api/src/common/dates/dates.service.spec.ts` — every worked example from requirements §6 |
| "What about phones?" | Resize to 390 px live. Cards replace the table, the sidebar becomes a bottom bar |
| "What would you do next?" | `CHANGELOG.md` → Known limitations. Lead with CI, then reminders |

## If something goes wrong

- **Dashboard looks wrong** → the seed is from a previous day. Say so, and move on
  to §1; the add-purchase flow is live data and never stale.
- **API not responding** → `curl localhost:3000/api/v1/health`. The error state is
  designed; show it rather than hiding it, and keep talking.
- **Upload fails** → check the file is really a PDF. That is the check working.
