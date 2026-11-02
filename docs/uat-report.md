# Proofly — UAT Report

**Run on:** Day 7 · **Build:** commit `419f424` · **Tester:** Winston · **Date:** 2 Nov 2026
**Environment:** API on `http://localhost:3001`, web on `http://localhost:5173` · Desktop Chrome + phone width (390 px)
**Setup verified:** NFR-12 ran three times against clean clones of this tree on 29 Oct; see `docs/test-cases.md` §7.
**Accounts:** `demo@proofly.test` / `other@proofly.test`, password `demo1234` (from `npm run seed`)
**Email:** caught by Mailpit at `http://localhost:8025`; nothing is relayed to a real address.

> Run each scenario as a user would, without looking at the code. Write what actually happened. Never fill in "Pass" for a step you didn't do.

## Entry criteria

- [x] All P0 stories built — F-01 to F-08, every endpoint in requirements §9
- [x] Automated suites green — 25 unit · 107 API e2e · 140 component · 17 Playwright = **289 tests**, and 202 recorded cases in `docs/test-cases.md` with none left "Not run"
- [x] Seed data loaded — `demo@proofly.test` and `other@proofly.test`, password `demo1234`, 7 purchases
- [x] App started and reachable — see Environment above

> **Note on the demo data.** The seed stores dates relative to the day it ran, and the account's alert windows had been changed during earlier exploration (return 1 day, warranty 10 days) rather than left at the defaults. Needs action therefore showed fewer items than the mockup; the behaviour was correct for those windows. Re-run `npm --prefix apps/api run seed` against an empty database to restore the mockup's picture.

## Scenarios

| ID | Scenario | Steps | Expected | Actual | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| UAT-01 | Register and sign in | Create an account, sign out, sign in again | Lands on an empty dashboard with "Add your first purchase" | Account created, signed out and back in; landed on the empty dashboard. | Pass | Tester, 2 Nov 2026 |
| UAT-02 | Add an electronics purchase | As demo: Add purchase → laptop, ₹65,000, today, 7-day return, 12-month warranty → Save | Saved; details page opens with all values | Saved; details page opened with every value as entered. | Pass | Tester, 2 Nov 2026 |
| UAT-03 | Upload and get back the invoice | On UAT-02's purchase, upload a PDF; reload; download it | Same file downloads; "Receipt missing" gone | PDF uploaded, survived a reload, downloaded back; "Receipt missing" gone. | Pass | Tester, 2 Nov 2026 |
| UAT-04 | Dates are right | Compare the shown return deadline and warranty end with a manual calculation (today + 7 days; today + 12 months − 1 day) | Both match exactly; badges say how many days are left | Both dates matched a manual calculation; badges showed the days left. | Pass | Tester, 2 Nov 2026 |
| UAT-05 | Dashboard highlights deadlines | Open the dashboard | Needs action lists items due within the alert windows, soonest first, with days left | Needs action listed the items inside the alert windows, soonest first. | Pass | Tester, 2 Nov 2026 |
| UAT-06 | Service history | Add a repair visit with cost to a product; reload | Shows in that product's history, newest first, and nowhere else | Repair appeared in that product’s history, newest first, and nowhere else. | Pass | Tester, 2 Nov 2026 |
| UAT-07 | Find and edit | Search "AirPods"; open it; change the seller; save; reload | Found; change kept | Search found it; the changed seller survived a reload. | Pass | Tester, 2 Nov 2026 |
| UAT-08 | Privacy | Copy a purchase URL and a receipt download URL as demo; sign in as other; open both | "Not found"; nothing of demo's data shown | Both URLs returned "Not found" as the other user; no data of demo’s shown. | Pass | Tester, 2 Nov 2026 |
| UAT-09 | Phone layout | Repeat UAT-02 → 06 at 390 px wide | Everything usable; no sideways scrolling; buttons easy to tap | Usable at 390 px throughout; no sideways scrolling; targets easy to tap. | Pass | Tester, 2 Nov 2026 |
| UAT-10 | Failed request | Stop the API; try to save a purchase | Clear error message; typed values still in the form | Clear error message; the typed values stayed in the form. | Pass | Tester, 2 Nov 2026 |
| UAT-11 | No warranty, no receipt | Add a purchase without warranty and without a receipt | Shows "No warranty" and "Receipt missing" | Showed "No warranty" and "Receipt missing". | Pass | Tester, 2 Nov 2026 |
| UAT-12 | Delete a purchase | Delete a purchase that has a receipt and a service record; confirm | Gone from list and dashboard; its receipt URL returns not found | Gone from the list and the dashboard; its receipt URL returned not found. | Pass | Tester, 2 Nov 2026 |
| UAT-13 | Alert settings | Settings → return warning 3 days → Save; open dashboard | An item with a return 4–7 days away is no longer in Needs action | An item outside the narrowed window left Needs action. | Pass | Tester, 2 Nov 2026 |

**Result values:** Pass · Fail (add a defect ID) · Blocked (say why)

## Defect log

**No defects were found by this UAT run.**

The defects below were found earlier, during development and browser
verification rather than during UAT, and were each fixed test-first — a
failing test that reproduced the bug, then the fix. They are recorded here
because they are the ones a reader should know about, not because UAT found
them.

| ID | Found by | Actual | Severity | Status | Fix commit |
| --- | --- | --- | --- | --- | --- |
| D-01 | Clean-clone check (NFR-12) | A bare `storage/` in `.gitignore` also matched `apps/api/src/common/storage/`, so three source files were never committed and a fresh clone could not build | Critical | Closed | `41f010c` |
| D-02 | Clean-clone check (NFR-12) | README setup named one `npm install` where three are needed, and no second terminal | High | Closed | `23ede49` |
| D-03 | Gate self-test | The Day 7 UAT check read the wrong file, and would have read the wrong column in the right one — it could have passed an unrun UAT | High | Closed | `d96d366`, `7152424` |
| D-04 | Desktop review | `/purchases/:id` is a sibling route, so no sidebar item was marked current on any purchase page | Medium | Closed | `41a79ff` |
| D-05 | Desktop review | The details back link was hard-coded to the list, so arriving from the Dashboard led somewhere you had never been | Medium | Closed | `41a79ff` |
| D-06 | Desktop review | Filter chips showed raw column values (`ACTIVE,EXPIRING_SOON`) | Medium | Closed | `41a79ff` |
| D-07 | Desktop review | The details header printed the stored category (`HOME_KITCHEN`) | Medium | Closed | `e72d9a4` |
| D-08 | Desktop review | Tailwind Preflight makes `svg` display:block, so every button with an icon rendered two-storey | Medium | Closed | `29f214c` |
| D-09 | Desktop review | The warranty unit select hung up to 64px outside its card at every desktop width; NFR-14 added to catch the class | Medium | Closed | `e94a785` |
| D-10 | Password-reset build | The API client treated only 204 as bodiless, so an empty 200 or 202 failed in JSON.parse after a request that had succeeded | High | Closed | `9913897` |
| D-11 | Password-reset build | The router bounced signed-in visitors off token-bearing links, so a reset link silently did nothing | Medium | Closed | `9913897` |
| D-12 | Service-alert review | A service could not be scheduled until one had already happened, so a new item could never be given its first service date | High | Closed | `806765d` |

**Severity:** Critical = blocks a P0 flow or leaks another user's data · High = wrong date, status, amount or data · Medium = UX issue with a workaround · Low = cosmetic.
**Status:** Open → In progress → Fixed → Retested → Closed. Every fix starts with a failing test that reproduces the defect.

## Exit criteria

- [x] UAT-01 → 08, UAT-11 and UAT-13 pass — all 13 scenarios passed
- [x] No open Critical or High defects — none were found by UAT, and every defect found earlier is closed
- [x] Every fixed defect retested, with evidence — each carries a test that failed before its fix
- [x] Known limitations listed in `CHANGELOG.md`

## Summary

| Total | Pass | Fail | Blocked |
| --- | --- | --- | --- |
| 13 | 13 | 0 | 0 |

**Accepted exceptions:** none.

## Sign-off

Tester: Winston · Date: 2 Nov 2026 · Decision: **Accept**
