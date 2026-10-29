import { describe, expect, it } from 'vitest';
import { formatDate, formatMoney, formatWarrantyLength } from './format';

/** FE-CMP-07 from docs/test-cases.md §3.2, formats from ui-guide §3. */
describe('Formatters', () => {
  it('FE-CMP-07 a date reads as 27 Oct 2026', () => {
    expect(formatDate('2026-10-27')).toBe('27 Oct 2026');
    expect(formatDate('2027-01-14')).toBe('14 Jan 2027');
    expect(formatDate('2026-02-28')).toBe('28 Feb 2026');
  });

  it('FE-CMP-07 a date is never shifted by the browser time zone', () => {
    // '2026-10-27' parsed as an instant is UTC midnight, which is the previous
    // day anywhere west of Greenwich. These are calendar dates (BR-05) and
    // must render as written wherever the user is.
    expect(formatDate('2026-01-01')).toBe('1 Jan 2026');
    expect(formatDate('2026-12-31')).toBe('31 Dec 2026');
  });

  it('FE-CMP-07 money reads as ₹24,900.00 in the Indian grouping', () => {
    expect(formatMoney(24900, 'INR')).toBe('₹24,900.00');
    // Lakh grouping, not thousands: 1,24,990 rather than 124,990.
    expect(formatMoney(124990, 'INR')).toBe('₹1,24,990.00');
    expect(formatMoney(0, 'INR')).toBe('₹0.00');
    expect(formatMoney(1450.5, 'INR')).toBe('₹1,450.50');
  });

  it('FE-CMP-07 a null date or missing value renders as a dash, not "null"', () => {
    expect(formatDate(null)).toBe('—');
  });

  it('warranty length reads in years when it divides evenly', () => {
    expect(formatWarrantyLength(24)).toBe('2 years');
    expect(formatWarrantyLength(12)).toBe('1 year');
    expect(formatWarrantyLength(18)).toBe('18 months');
    expect(formatWarrantyLength(1)).toBe('1 month');
    expect(formatWarrantyLength(null)).toBe('—');
  });
});
