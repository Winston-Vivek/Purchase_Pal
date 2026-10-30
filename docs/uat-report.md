# Proofly — UAT Report

**Run on:** Day 7 · **Build:** commit `7152424` · **Tester:** Winston · **Date:** 30 Oct 2026
**Environment:** API on `http://localhost:3001`, web on `http://localhost:5173` · Desktop Chrome + phone width (390 px)
**Setup verified:** NFR-12 ran three times against clean clones of this tree on 29 Oct; see `docs/test-cases.md` §7.
**Accounts:** `demo@proofly.test` / `other@proofly.test`, password `demo1234` (from `npm run seed`)

> Run each scenario as a user would, without looking at the code. Write what actually happened. Never fill in "Pass" for a step you didn't do.

## Entry criteria

- [x] All P0 stories built — F-01 to F-08, every endpoint in requirements §9
- [x] Automated suites green — 25 unit · 107 API e2e · 140 component · 17 Playwright = **289 tests**, and 202 recorded cases in `docs/test-cases.md` with none left "Not run"
- [x] Seed data loaded — `demo@proofly.test` and `other@proofly.test`, password `demo1234`, 7 purchases
- [x] App started and reachable — see Environment above

> **Note on the demo data.** The seed stores dates relative to the day it ran (29 Oct). On 30 Oct the Samsung AC warranty has passed its last covered day, so it has moved from *Needs action* into *Recently expired* — BR-03 and BR-04 behaving correctly. The dashboard currently shows **2** items needing action (Nike 3 days, AirPods 6 days) rather than the 3 in the mockup. Re-run `npm --prefix apps/api run seed` against an empty database to restore the mockup's picture.

## Scenarios

| ID | Scenario | Steps | Expected | Actual | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| UAT-01 | Register and sign in | Create an account, sign out, sign in again | Lands on an empty dashboard with "Add your first purchase" | | | |
| UAT-02 | Add an electronics purchase | As demo: Add purchase → laptop, ₹65,000, today, 7-day return, 12-month warranty → Save | Saved; details page opens with all values | | | |
| UAT-03 | Upload and get back the invoice | On UAT-02's purchase, upload a PDF; reload; download it | Same file downloads; "Receipt missing" gone | | | |
| UAT-04 | Dates are right | Compare the shown return deadline and warranty end with a manual calculation (today + 7 days; today + 12 months − 1 day) | Both match exactly; badges say how many days are left | | | |
| UAT-05 | Dashboard highlights deadlines | Open the dashboard | Needs action lists items due within the alert windows, soonest first, with days left | | | |
| UAT-06 | Service history | Add a repair visit with cost to a product; reload | Shows in that product's history, newest first, and nowhere else | | | |
| UAT-07 | Find and edit | Search "AirPods"; open it; change the seller; save; reload | Found; change kept | | | |
| UAT-08 | Privacy | Copy a purchase URL and a receipt download URL as demo; sign in as other; open both | "Not found"; nothing of demo's data shown | | | |
| UAT-09 | Phone layout | Repeat UAT-02 → 06 at 390 px wide | Everything usable; no sideways scrolling; buttons easy to tap | | | |
| UAT-10 | Failed request | Stop the API; try to save a purchase | Clear error message; typed values still in the form | | | |
| UAT-11 | No warranty, no receipt | Add a purchase without warranty and without a receipt | Shows "No warranty" and "Receipt missing" | | | |
| UAT-12 | Delete a purchase | Delete a purchase that has a receipt and a service record; confirm | Gone from list and dashboard; its receipt URL returns not found | | | |
| UAT-13 | Alert settings | Settings → return warning 3 days → Save; open dashboard | An item with a return 4–7 days away is no longer in Needs action | | | |

**Result values:** Pass · Fail (add a defect ID) · Blocked (say why)

## Defect log

| ID | Scenario | Actual | Expected | Severity | Status | Fix commit | Retest |
| --- | --- | --- | --- | --- | --- | --- | --- |
| D-01 | | | | | Open | | |

**Severity:** Critical = blocks a P0 flow or leaks another user's data · High = wrong date, status, amount or data · Medium = UX issue with a workaround · Low = cosmetic.
**Status:** Open → In progress → Fixed → Retested → Closed. Every fix starts with a failing test that reproduces the defect.

## Exit criteria

- [ ] UAT-01 → 08, UAT-11 and UAT-13 pass
- [ ] No open Critical or High defects (or each one accepted in writing below)
- [ ] Every fixed defect retested, with evidence
- [ ] Known limitations listed in `CHANGELOG.md`

## Summary

| Total | Pass | Fail | Blocked |
| --- | --- | --- | --- |
| 13 | | | |

**Accepted exceptions:** ________

## Sign-off

Tester: ________ · Date: ________ · Decision: Accept / Accept with exceptions / Reject
