/** Display formats from ui-guide §3. */

/**
 * A calendar date as `27 Oct 2026`.
 *
 * Built from the parts rather than `new Date(iso)`: parsing 'YYYY-MM-DD' as an
 * instant gives UTC midnight, which is the previous day in any zone west of
 * Greenwich. These are calendar dates (BR-05) and must read as written.
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';

  const date = new Date(
    Number(iso.slice(0, 4)),
    Number(iso.slice(5, 7)) - 1,
    Number(iso.slice(8, 10)),
  );

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/** `₹24,900.00` — en-IN groups in lakhs, so ₹1,24,990.00 not ₹124,990.00. */
export function formatMoney(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Months, or years when it divides evenly: "2 years", "18 months". */
export function formatWarrantyLength(months: number | null | undefined): string {
  if (months === null || months === undefined) return '—';

  if (months % 12 === 0) {
    const years = months / 12;
    return `${years} ${years === 1 ? 'year' : 'years'}`;
  }

  return `${months} ${months === 1 ? 'month' : 'months'}`;
}

/** "3 days" / "1 day" — the singular matters in a badge people read quickly. */
export function pluralDays(days: number): string {
  return `${days} ${Math.abs(days) === 1 ? 'day' : 'days'}`;
}
