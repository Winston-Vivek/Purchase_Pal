# Proofly — UI/UX Design Guide (Step 2, v0.1 for review)

**Status:** Draft for the Day 2 gate · **Date:** 27 Oct 2026 · **Owner:** Winston
**Inputs:** `docs/requirements.md` v1.0 (locked), UI UX Pro Max skill (style, color, typography, UX domains), effective-html (`html-wireframe`), TailGrids Vue (patterns only), Tailwind CSS v4.

The UI answers three questions at a glance: **What did I buy? Where is the receipt? Which deadline is close?** Everything below serves those three questions.

---

## 1. Design direction

| Decision | Choice | Why |
| --- | --- | --- |
| Style | **Minimalism & Swiss** (UI UX Pro Max catalog) | Rated for dashboards and professional tools, accessibility risk *low*; content and dates carry the screen, not decoration |
| Mode | Light only for MVP; tokens are semantic so dark mode is a token swap later (P2) | Saves a day of contrast QA; no requirement asks for dark mode |
| Palette | Skill's *Personal Finance Tracker* palette — trust blue + green — adapted from dark to light | Blue reads as "records you can trust"; green is reserved for status, not decoration |
| Type | **Lexend** (headings) + **Source Sans 3** (body) — skill pairing *Corporate Trust* | Built for readability; good figures for dates and prices |
| Icons | Lucide (`@lucide/vue`), outline, 20 px | Skill rule: no emoji as icons. *(29 Oct 2026: `lucide-vue-next` is deprecated upstream in favour of `@lucide/vue`; same icons, same API.)* |
| Depth | Borders, no shadows; one elevation level for modals and menus only | Swiss style; borders survive any background |
| Motion | 150–200 ms colour/opacity transitions only; none under `prefers-reduced-motion` | Skill checklist |

**Rejected from the skill's generator output:** glassmorphism on dark navy and the Caveat/Quicksand handwritten pairing. The generator matched a marketing landing page; Proofly is a records tool where legibility of dates and amounts matters most.

---

## 2. Design tokens (Tailwind CSS v4)

Put this in `apps/web/src/assets/main.css`. Tailwind v4 reads tokens from `@theme`; no `tailwind.config.js`.

```css
@import "tailwindcss";

@theme {
  /* Type */
  --font-heading: "Lexend", ui-sans-serif, system-ui, sans-serif;
  --font-sans: "Source Sans 3", ui-sans-serif, system-ui, sans-serif;

  /* Surfaces and text */
  --color-bg: #F8FAFC;          /* page */
  --color-surface: #FFFFFF;     /* cards, inputs */
  --color-subtle: #F1F5F9;      /* table header, hover, neutral tint */
  --color-fg: #0F172A;          /* primary text      17.1:1 on bg */
  --color-muted-fg: #475569;    /* secondary text     7.2:1 on bg */
  --color-border: #E2E8F0;      /* decorative dividers */
  --color-input: #64748B;       /* input borders      4.8:1 on white */

  /* Brand */
  --color-primary: #1E40AF;     /* buttons, links     8.7:1 with white */
  --color-primary-hover: #1E3A8A;
  --color-primary-tint: #EFF6FF;
  --color-ring: #2563EB;        /* focus ring */
  --color-danger: #DC2626;      /* destructive button 4.8:1 with white */
  --color-danger-hover: #B91C1C;

  /* Status (text on tint, all ≥ 4.8:1) */
  --color-ok-fg: #047857;       --color-ok-bg: #ECFDF5;
  --color-warn-fg: #B45309;     --color-warn-bg: #FFFBEB;
  --color-bad-fg: #B91C1C;      --color-bad-bg: #FEF2F2;
  --color-none-fg: #475569;     --color-none-bg: #F1F5F9;

  /* Shape */
  --radius-sm: 6px;   /* inputs, badges */
  --radius-md: 8px;   /* buttons, cards */
  --radius-lg: 12px;  /* modals */
}
```

Load fonts once in `index.html`:
`https://fonts.googleapis.com/css2?family=Lexend:wght@500;600&family=Source+Sans+3:wght@400;600&display=swap`

**Rule:** components use only these tokens (`bg-surface`, `text-muted-fg`, `border-border`). No raw hex, no `bg-blue-600` in components.

### Spacing and layout

| Token | Value | Use |
| --- | --- | --- |
| Base unit | 4 px (Tailwind default scale) | All spacing |
| Card padding | 16 px mobile, 24 px desktop | `p-4 lg:p-6` |
| Section gap | 24 px mobile, 32 px desktop | `gap-6 lg:gap-8` |
| Content width | max 1200 px | `max-w-[1200px] mx-auto` |
| Sidebar | 240 px at `lg` (≥ 1024 px) | Desktop navigation |
| Form width | max 640 px; Add/Edit and Settings widen to 1040 px from `lg` | Auth stays at 640. Changed 2 Nov 2026: at 640 the purchase form used about a third of a desktop, so from `lg` it becomes two columns — Product across the top, Return and Warranty side by side. Settings follows the same rule: Alerts in one column, Password and Account in the other. |

### Type scale

| Role | Font | Size / line | Weight |
| --- | --- | --- | --- |
| Page title | Lexend | 24 / 32 (28 / 36 at `lg`) | 600 |
| Section title | Lexend | 18 / 28 | 600 |
| Card title, product name | Source Sans 3 | 16 / 24 | 600 |
| Body | Source Sans 3 | 16 / 24 | 400 |
| Secondary, meta | Source Sans 3 | 14 / 20 | 400 |
| Badge | Source Sans 3 | 13 / 18 | 600 |
| Big number (dashboard count) | Lexend | 28 / 36 | 600, `tabular-nums` |

Body text never goes below 14 px. Prices, dates and counts use `tabular-nums` so columns align.

---

## 3. Status system

Status is the heart of the product, so it gets one component (`StatusBadge`) used everywhere. Every badge has **icon + words + colour** — never colour alone (skill UX rule *Color Only*, severity High).

| Status (BR-04) | Badge text | Icon | Tokens |
| --- | --- | --- | --- |
| Active | `Covered · 214 days left` / `Return open · 12 days left` | `circle-check` | ok |
| Expiring soon | `Warranty ends in 5 days` / `Return closes in 3 days` | `alert-triangle` | warn |
| Last day | `Return closes today` | `alert-triangle` | warn, bold |
| Expired | `Warranty ended 12 Oct 2026` / `Return closed 20 Oct 2026` | `x-circle` | bad |
| Not set | `No return window` / `No warranty` | `minus-circle` | none |
| Receipt missing (BR-06) | `Receipt missing` | `file-x` | warn |

Rules:
- Badge text says what happened, not just a state name: "Return closes in 3 days" beats "Expiring".
- Days left is calendar days from today in Asia/Kolkata (BR-04/D-10).
- Badges wrap whole; they never truncate (skill rule *resilient text*).
- On lists, show at most two badges per row: the more urgent deadline first, then receipt state.

### Formats

| Thing | Format | Example |
| --- | --- | --- |
| Date | `D MMM YYYY` via `Intl.DateTimeFormat('en-IN')` | 27 Oct 2026 |
| Date + relative | date · relative | 3 Nov 2026 · in 7 days |
| Money | `Intl.NumberFormat('en-IN', { style: 'currency', currency })` | ₹65,000.00 |
| Warranty length | months, or years when divisible by 12 | 2 years · 18 months |

---

## 4. Components

TailGrids Vue is archived and built for Tailwind v3, so we **copy the markup pattern and rewrite classes with our tokens**. We do not install its plugin.

| Component | Pattern source | Notes |
| --- | --- | --- |
| `AppShell` | TailGrids navbar / sidebar patterns | Sidebar ≥ 1024 px; top bar + bottom tab bar below |
| `PageHeader` | — | Title, optional subtitle, one primary action on the right (desktop) |
| `StatCard` | TailGrids card patterns | Label, big number, link to filtered list |
| `StatusBadge` | TailGrids badge patterns | Section 3; icon + text + tint |
| `DeadlineRow` | TailGrids list patterns | Product, which deadline, date, badge; whole row is one link |
| `PurchaseCard` (mobile) / `PurchaseTable` (≥ 768 px) | TailGrids table + card patterns | Same data; table collapses to cards |
| `BaseButton` | TailGrids button patterns | `primary`, `secondary`, `ghost`, `danger`; min height 44 px; `cursor-pointer` |
| `BaseInput`, `BaseSelect`, `DateInput`, `MoneyInput` | TailGrids form patterns | Visible label above, hint below, error below hint |
| `FileDrop` | — | Drop zone + "Choose file" button; shows type and 5 MB limit up front |
| `AttachmentItem` | — | Icon by type, file name, size, Download, Delete |
| `ServiceTimeline` | — | Newest first; date, provider, problem, cost |
| `ConfirmDialog` | TailGrids modal patterns | Names the thing being deleted and what goes with it |
| `ServiceDialog` | TailGrids modal patterns | Add/edit service record |
| `EmptyState` | — | One sentence + one action |
| `ErrorSummary` | — | Top of form, focus moves here after failed submit |
| `Toast` | TailGrids alert patterns | Success confirmations, `role="status"` |
| `Skeleton` | — | Loading placeholder matching final layout |

### Buttons

| Variant | Use | Style |
| --- | --- | --- |
| Primary | One per screen: Save, Add purchase, Sign in | `bg-primary text-white hover:bg-primary-hover` |
| Secondary | Cancel, Add service record | `border border-input bg-surface text-fg` |
| Ghost | Inline actions: Edit, Download | `text-primary hover:bg-primary-tint` |
| Danger | Delete in confirm dialogs only | `bg-danger text-white` |

All buttons: 44 px min height, visible focus ring (`focus-visible:ring-2 ring-ring ring-offset-2`), disabled state at 50% opacity with `aria-disabled`, loading state keeps width and shows a spinner + "Saving…".

---

## 5. Navigation and screen map

```
Sign in ⇄ Create account
   │
   ▼
Dashboard ──► Purchase details ──► Edit purchase
   │                │                 ▲
   ▼                ├─► Add service record (dialog)
My purchases ───────┘ ├─► Upload / download receipt
   │                  └─► Delete (confirm) → My purchases
   ▼
Add purchase ──► Purchase details
Settings (alert windows)
```

| Nav item | Desktop (sidebar) | Mobile (bottom bar) |
| --- | --- | --- |
| Dashboard | yes | yes |
| Purchases | yes | yes |
| Add purchase | button at top of sidebar | centre tab, primary colour |
| Settings | yes | yes |
| Sign out | sidebar footer | inside Settings |

Current page is shown with a left bar (desktop) or filled icon + label (mobile), not colour alone.

---

## 6. Screen specs

### S1 Sign in / Create account
- Centered card, max 400 px. Product name + one-line value ("Every receipt, return and warranty in one place").
- Fields: email, password (show/hide toggle); register adds name and password rule hint.
- Errors: wrong credentials → one message above the form ("Email or password is incorrect"); never says which.
- Demo accounts listed under the form in dev/demo builds only.

### S2 Dashboard — two directions to choose from (see wireframes)
- **A · Action list first:** 4 compact counts in one row, then *Needs action* as the main block, then *Recently expired* and *Recent purchases*.
- **B · Deadline timeline:** deadlines grouped *Today / This week / Next 30 days / Recently expired*, counts in a side rail (desktop) or a horizontal strip (mobile).
- Both: each deadline row links to Purchase details; empty state "Nothing needs action. Next deadline: AirPods return on 3 Nov".

### S3 My purchases
- Search box (name, seller, notes), filters: Category, Return status, Warranty status; sort: Newest, Price, Nearest deadline.
- ≥ 768 px: table with Product, Purchased, Price, Return, Warranty, Receipt. < 768 px: cards.
- Active filters shown as removable chips with a "Clear all".
- States: loading skeleton, empty (no purchases yet → Add purchase), no results (→ Clear filters), error (retry).
- Pagination 20 per page, "Showing 21–40 of 57".

### S4 Purchase details — two directions to choose from
- **A · Single page:** header (name, category, seller, price, purchase date, Edit), then *Return* and *Warranty* panels side by side, *Receipts*, *Service history*. On mobile, a sticky "Jump to" row.
- **B · Tabs:** same header and both deadline panels always visible; *Receipts* and *Service history* in tabs below.
- Deadline panel shows: status badge, the date, how it was calculated ("7-day window from 20 Oct 2026" or "Entered manually"), days left.
- Receipt missing → warn banner with an Upload button.
- Delete purchase sits at the bottom in a "Danger zone", not next to Edit.

### S5 Add / Edit purchase
- Single column, max 640 px, three groups with headings: **Product** (name, category, seller, price + currency, purchase date, notes), **Return** (choose: "Return window in days" or "Exact last date"; or "No return"), **Warranty** (toggle "Has warranty" → start date defaulting to purchase date, length in months/years).
- Live preview under Return and Warranty: "Return closes 27 Oct 2026 · in 0 days" so users see the rule result before saving.
- Receipt upload on create (optional), shows limits: "PDF, JPG, PNG or WEBP · up to 5 MB · max 5 files".
- Validation: inline on blur for format, full check on submit; `ErrorSummary` at the top linking to each field (skill rule *Focusable Error Summary*, High). Data is kept after a failed save.
- Sticky bottom bar on mobile with Cancel and Save.
- Leaving with unsaved changes asks for confirmation.

### S6 Service record dialog
- Fields: date (default today), problem/work done, provider, cost, notes.
- Opens from Purchase details; focus trapped inside; Esc closes; focus returns to the trigger.

### S7 Settings
- "Warn me before a warranty ends: [30] days (1–365)" and "Warn me before a return window closes: [7] days (1–60)".
- Preview sentence updates as you type. Save shows a toast; dashboard uses new values immediately (US-08).
- Account block: name, email, Sign out.

---

## 7. States checklist (every data screen)

| State | Pattern |
| --- | --- |
| Loading | Skeleton shaped like the final content; no spinner-only pages |
| Empty | One sentence of why + the next action |
| No results | Say which filters are active + "Clear filters" |
| Error (load) | Plain message + "Try again"; keep any data already shown |
| Error (save) | `ErrorSummary` + inline field errors; form keeps values |
| Success | Toast "Purchase saved" (`role="status"`), then navigate |
| Session expired | Redirect to Sign in, then back to the same page |
| Destructive | `ConfirmDialog` naming the item and what is deleted with it |

---

## 8. Accessibility and responsive checklist (pre-delivery)

From UI UX Pro Max's pre-delivery checklist and UX guidelines, applied to Proofly:

- [ ] Text contrast ≥ 4.5:1; UI borders and icons ≥ 3:1 (tokens above are pre-checked)
- [ ] Status never by colour alone: icon + words on every badge
- [ ] Visible focus on every interactive element (`focus-visible` ring)
- [ ] Keyboard: full flow from sign-in to adding a service record without a mouse
- [ ] Every input has a visible `<label>`; errors linked with `aria-describedby`; error summary focusable
- [ ] Errors announced (`role="alert"` on the summary, `role="status"` for toasts)
- [ ] Touch targets ≥ 44 px for buttons and inputs (WCAG 2.2 minimum is 24 px; we exceed it for mobile)
- [ ] Correct input types: `email`, `date`, `number` with `inputmode="decimal"` for money
- [ ] `cursor-pointer` on all clickable elements; whole rows are links where rows are clickable
- [ ] No emoji icons; Lucide SVGs with `aria-hidden="true"` when decorative
- [ ] `prefers-reduced-motion` disables transitions
- [ ] Badges and chips wrap without clipping at 360 px and 200% zoom
- [ ] No horizontal scroll at 360, 768, 1024, 1440 px
- [ ] Dialogs trap focus, close on Esc, return focus to the trigger
- [ ] Page `<title>` changes per route; one `<h1>` per page

---

## 9. Open questions for the Day 2 gate

1. Dashboard: direction **A (action list first)** or **B (deadline timeline)**?
2. Purchase details: **A (single page)** or **B (tabs)**?
3. Keep light-only for the MVP, with dark mode as P2?
4. Any change to badge wording in Section 3?
