# Plan — email, password reset, password change, reminders

Four pieces, in the order they unblock each other. Nothing here changes an
existing business rule; it adds BR-13 to BR-15 and three tables.

**Status: planned, not built.** Effort below is careful-work estimate including
tests, not best case.

| # | Slice | Depends on | Effort |
| --- | --- | --- | --- |
| 1 | Email delivery (Mailpit + `MailService`) | — | ~2h |
| 2 | Change password, signed in | 1 (for the notification) | ~1.5h |
| 3 | Forgot password | 1 | ~3h |
| 4 | Deadline reminder emails | 1 | ~3h |

Slice 2 before 3 deliberately: it is smaller, it exercises the same password
rules and the same session-invalidation machinery, and it carries far less
risk. Getting it right makes slice 3 mostly plumbing.

---

## 1. Email delivery

**Transport: Mailpit**, added to `docker-compose.yml`. It is a single container
that accepts SMTP on 1025 and shows every message in a web inbox on 8025. No
account, no API key, nothing leaves the machine — which is the point: a bug in
a reminder job must not be able to email real people.

```yaml
mail:
  image: axllent/mailpit
  ports: ["1025:1025", "8025:8025"]   # SMTP, web inbox
```

**One new dependency: `nodemailer`.** Not `@nestjs-modules/mailer` — we need a
transport and four small templates, and that package brings a template engine
we would not use.

**`MailService` behind a `MAILER` token**, exactly like `STORAGE` (D-06): the
real one talks SMTP, tests get a recorder that keeps what was sent. No test
ever opens a socket, and every test can assert on the actual subject and body.

```
apps/api/src/common/mail/
  mail.interface.ts     send(message: Mail): Promise<void>
  smtp.mailer.ts        nodemailer, from config
  mail.module.ts        provides MAILER
  templates.ts          plain functions: subject + text + html
```

**Config, fail-fast like the rest:** `SMTP_HOST`, `SMTP_PORT`, `MAIL_FROM`,
`APP_URL` (the base for links in emails — never taken from a request header,
which is how host-header injection turns a reset link into an attacker's).

**Every email is plain text first, HTML second.** A reset link that only works
in an HTML client is a broken reset link.

**Failure policy:** sending is best-effort and never fails the request it
belongs to. A password reset that 500s because SMTP is down tells an attacker
nothing useful and the user something false. Failures are logged; the reminder
job retries on its next run.

---

## 2. Change password (signed in)

`PATCH /users/me/password` · `{ currentPassword, newPassword }`

**The current password is required even though they are signed in.** A stolen
session must not be able to lock the real owner out of their own account. This
is the single most important line in the slice.

- Wrong current password → **400**, not 401: a 401 would look like the session
  expired and send them to sign in again.
- `newPassword` goes through the same rule as registration. Same hash cost.
- Timing: `bcrypt.compare` runs before anything else, as it does at login.

**Session invalidation (BR-13).** A password change that leaves other sessions
alive is theatre — "someone has my account" is the main reason people change a
password. Our JWT is stateless, so:

- add `users.password_changed_at` (timestamptz, set on every password change);
- the guard rejects any token whose `iat` is **older than** that timestamp;
- the current device is re-issued a fresh cookie, so the user is not signed out
  by their own action.

That is about fifteen lines in `JwtAuthGuard` and gives real revocation without
a session table.

**Notification email:** "your password was changed". Sent after the change, not
before, and never containing the password. This is how someone learns their
account was taken.

**UI:** a third section on Settings — current, new, confirm; inline errors;
success toast. Nothing fancy; the page already has the pattern.

**Tests:** happy path; wrong current password; weak new password; the old
cookie stops working afterwards and the new one keeps working; another user
cannot change your password.

---

## 3. Forgot password

Two endpoints, both `@Public()`.

```
POST /auth/forgot-password   { email }               → 202 always
POST /auth/reset-password    { token, password }     → 200
```

**Always 202, whether or not the account exists.** Identical response, and the
work is done after the response is queued so the timing does not differ either.
`/auth/login` already refuses to say whether an email is registered; an
enumeration oracle on the reset endpoint would undo that.

**The token (BR-14):**

| Property | Choice | Why |
| --- | --- | --- |
| Generation | `randomBytes(32).toString('base64url')` | 256 bits; guessing is not a threat model |
| Storage | **SHA-256 of the token**, never the token | A leaked database must not hand out password resets |
| Hash choice | SHA-256, not bcrypt | The input is already high-entropy; bcrypt buys nothing and costs a lookup |
| Lifetime | 30 minutes | Long enough to find the email, short enough to matter |
| Uses | One. `used_at` is set inside the same transaction as the password write | |
| On request | Any unused token for that user is invalidated first | Asking again should not leave two live keys |
| On use | `password_changed_at` bumped → every session dies (BR-13) | The point of a reset |

New table `password_reset_tokens` (`id`, `user_id`, `token_hash` unique,
`expires_at`, `used_at`, `created_at`), indexed on `token_hash`.

**The link** is `${APP_URL}/reset-password?token=…`. `APP_URL` comes from
config, never from the `Host` header.

**After a successful reset the user signs in.** No automatic session from an
emailed link: possession of an inbox at one moment should not silently become a
logged-in browser. It is one extra step and a materially better property. (Open
to the opposite call — say so and I will change it.)

**Rate limiting is not optional here.** This endpoint sends mail to an address
an anonymous caller chose, which is an email-bombing tool if left open. Adds
`@nestjs/throttler`: 3 requests per email per hour, 10 per IP per hour, and a
tighter limit on `/auth/login` while we are there. This also closes the first
gap listed in `docs/security.md` §8.

**UI:** two pages — `/forgot-password` (email → "if that address has an
account, we have sent a link", shown whatever happens) and `/reset-password`
(new password + confirm, token from the query). A "Forgot your password?" link
on the sign-in page.

**Tests:** unknown email still 202; token works once; expired token refused;
tampered token refused; requesting twice kills the first token; after reset the
old password fails and old sessions are dead; the response body never contains
the token.

---

## 4. Deadline reminder emails

A daily digest, not one email per deadline.

**Schedule:** `@nestjs/schedule`, 08:00 Asia/Kolkata (D-10). One run, all users.

**What it sends:** for each user, the deadlines whose `daysLeft` has reached
their own alert window — returns, warranties and services alike. Reuses
`DashboardService`'s resolution, so the email and the dashboard can never
disagree, which is the whole reason not to write a second query.

**Dedupe (BR-15) is the hard part.** Without it the job emails the same
deadline every morning until it expires, which is how a useful product becomes
spam. New table `sent_reminders` (`user_id`, `purchase_id`, `kind`,
`deadline_date`, `sent_at`) with a **unique index on the first four columns**.
The uniqueness constraint — not application logic — is what makes a second send
impossible, including if the job runs twice.

A deadline that moves (an edited date) is a different row, so it is allowed to
remind again. That is correct: the user changed the thing.

**Opt-out:** `users.email_reminders` boolean, default true, with a checkbox on
Settings. An unsubscribe link in the footer is the honest version, and is a
sixth endpoint; worth doing if this ships to anyone real.

**Tests:** a deadline inside the window is sent once; running twice sends once;
a deadline outside the window is not sent; a user who opted out gets nothing;
one user's deadlines never reach another's inbox; the digest groups several
deadlines into one message.

---

## What this adds

- **3 tables**: `password_reset_tokens`, `sent_reminders`, plus two columns on
  `users` (`password_changed_at`, `email_reminders`)
- **5 endpoints**: forgot, reset, change password, and (optional) unsubscribe
- **3 dependencies**: `nodemailer`, `@nestjs/schedule`, `@nestjs/throttler`
- **2 business rules**: BR-13 session invalidation, BR-14 reset tokens,
  BR-15 reminder dedupe
- **~35 test cases**, of which the ones that matter are the refusals

## Risks worth saying out loud

1. **A reset endpoint is the most attacked thing in a small app.** The four
   properties that carry it are: no enumeration, hashed storage, single use,
   and rate limiting. If a corner gets cut under time pressure, it must not be
   one of those four.
2. **A scheduled job that sends email is the easiest way to do real damage.**
   Mailpit means it physically cannot reach a real address in development, and
   the unique index means it cannot send twice.
3. **Stateless JWT has no revocation.** `password_changed_at` gives us one for
   the case that matters without a session table, but it is coarse: it kills
   every session, including the ones the user wanted. That is the right default
   for a password change.
