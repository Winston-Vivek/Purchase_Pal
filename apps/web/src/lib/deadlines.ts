/**
 * BR-01 and BR-02 in the browser, for the live previews on the add/edit form.
 *
 * This is a deliberate second implementation of rules that otherwise live only
 * in apps/api/src/common/dates (CLAUDE.md non-negotiable 6). The form has to
 * show the answer before saving, and asking the server on every keystroke
 * would be worse. The drift risk is handled by pinning this file to the SAME
 * cases as the API's DatesService — see deadlines.spec.ts, which mirrors
 * UT-DATE-01..12. If either implementation moves, a suite goes red.
 *
 * A shared package would remove the duplication outright; it is not worth the
 * ESM/CommonJS split between the two apps for four functions, and the shared
 * test table gives most of the protection.
 */

/** D-10: the API resolves "today" in Asia/Kolkata, so the preview must too —
 *  otherwise a user abroad sees a different number of days than gets stored. */
const APP_TIMEZONE = 'Asia/Kolkata';
const MS_PER_DAY = 86_400_000;

const pad = (value: number, width: number) => String(value).padStart(width, '0');

function format(year: number, month: number, day: number): string {
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}

function isValid(iso: string | null | undefined): iso is string {
  return typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(iso);
}

/** Day 0 of the next month is the last day of this one. */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function todayIso(): string {
  // en-CA already formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function addDays(iso: string, days: number): string {
  const shifted = new Date(
    Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) +
      days * MS_PER_DAY,
  );

  return format(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
}

/**
 * BR-01. Add the months, then step back a day — except when the start day does
 * not exist in the target month, where the answer is that month's last day and
 * the minus-one does NOT apply. 31 Jan + 1 month is 28 Feb, not 27 Feb.
 */
export function warrantyExpiry(
  startDate: string | null | undefined,
  months: number | null | undefined,
): string | null {
  if (!isValid(startDate) || months === null || months === undefined) return null;

  const startYear = Number(startDate.slice(0, 4));
  const startMonth = Number(startDate.slice(5, 7));
  const startDay = Number(startDate.slice(8, 10));

  const monthsFromYearZero = startMonth - 1 + months;
  const year = startYear + Math.floor(monthsFromYearZero / 12);
  const month = (monthsFromYearZero % 12) + 1;

  const lastDay = daysInMonth(year, month);
  if (startDay > lastDay) return format(year, month, lastDay);

  return addDays(format(year, month, startDay), -1);
}

/** BR-02. A typed date wins over the window. */
export function returnDeadline(
  purchaseDate: string | null | undefined,
  windowDays: number | null | undefined,
  manualDeadline: string | null | undefined,
): string | null {
  if (isValid(manualDeadline)) return manualDeadline;
  if (!isValid(purchaseDate) || windowDays === null || windowDays === undefined) return null;

  return addDays(purchaseDate, windowDays);
}

/** BR-03: 0 means today, and today is still open. */
export function daysFromToday(
  deadline: string | null | undefined,
  today: string = todayIso(),
): number | null {
  if (!isValid(deadline)) return null;

  const target = Date.UTC(
    Number(deadline.slice(0, 4)),
    Number(deadline.slice(5, 7)) - 1,
    Number(deadline.slice(8, 10)),
  );
  const from = Date.UTC(
    Number(today.slice(0, 4)),
    Number(today.slice(5, 7)) - 1,
    Number(today.slice(8, 10)),
  );

  return Math.round((target - from) / MS_PER_DAY);
}
