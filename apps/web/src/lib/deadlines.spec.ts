import { describe, expect, it } from 'vitest';
import { daysFromToday, returnDeadline, warrantyExpiry } from './deadlines';

/**
 * The SAME cases as UT-DATE-01..12 in docs/test-cases.md §1.
 *
 * The add/edit form shows the deadline before saving (ui-guide §6), so BR-01
 * and BR-02 have to run in the browser. That is a second implementation of a
 * business rule, which CLAUDE.md otherwise forbids — so it is pinned to the
 * very same table the API's DatesService is pinned to. If either drifts, one
 * of the two suites goes red.
 */
describe('Deadline rules in the browser', () => {
  describe('warrantyExpiry — BR-01, mirroring UT-DATE-01..07', () => {
    it('UT-DATE-01 start 2026-01-15 + 12 months is 2027-01-14', () => {
      expect(warrantyExpiry('2026-01-15', 12)).toBe('2027-01-14');
    });

    it('UT-DATE-02 start 2026-01-31 + 1 month clamps to the end of February', () => {
      // The clamp does NOT then subtract a day. This is the rule most likely
      // to be got wrong independently in two places.
      expect(warrantyExpiry('2026-01-31', 1)).toBe('2026-02-28');
    });

    it('UT-DATE-03 leap day 2024-02-29 + 12 months is 2025-02-28', () => {
      expect(warrantyExpiry('2024-02-29', 12)).toBe('2025-02-28');
    });

    it('UT-DATE-04 start 2026-03-31 + 1 month clamps to 2026-04-30', () => {
      expect(warrantyExpiry('2026-03-31', 1)).toBe('2026-04-30');
    });

    it('UT-DATE-05 start 2025-11-02 + 12 months is 2026-11-01', () => {
      expect(warrantyExpiry('2025-11-02', 12)).toBe('2026-11-01');
    });

    it('UT-DATE-06 start 2024-10-20 + 24 months is 2026-10-19', () => {
      expect(warrantyExpiry('2024-10-20', 24)).toBe('2026-10-19');
    });

    it('UT-DATE-07 a missing start or length means no warranty', () => {
      expect(warrantyExpiry(null, 12)).toBeNull();
      expect(warrantyExpiry('2026-01-15', null)).toBeNull();
      expect(warrantyExpiry('', 12)).toBeNull();
    });
  });

  describe('returnDeadline — BR-02, mirroring UT-DATE-08..12', () => {
    it('UT-DATE-08 purchase 2026-10-20 with a 7 day window closes 2026-10-27', () => {
      expect(returnDeadline('2026-10-20', 7, null)).toBe('2026-10-27');
    });

    it('UT-DATE-09 a manual deadline overrides the window', () => {
      expect(returnDeadline('2026-10-20', 7, '2026-11-15')).toBe('2026-11-15');
    });

    it('UT-DATE-10 no window and no manual deadline means not set', () => {
      expect(returnDeadline('2026-10-20', null, null)).toBeNull();
    });

    it('UT-DATE-11 a window of 0 days closes on the purchase date itself', () => {
      expect(returnDeadline('2026-10-20', 0, null)).toBe('2026-10-20');
    });

    it('UT-DATE-12 a window crossing the year end is still correct', () => {
      expect(returnDeadline('2026-12-28', 10, null)).toBe('2027-01-07');
    });
  });

  describe('daysFromToday', () => {
    it('counts whole calendar days, inclusive of the deadline day (BR-03)', () => {
      expect(daysFromToday('2026-11-03', '2026-10-27')).toBe(7);
      expect(daysFromToday('2026-10-27', '2026-10-27')).toBe(0);
      expect(daysFromToday('2026-10-26', '2026-10-27')).toBe(-1);
      expect(daysFromToday('2027-10-26', '2026-10-27')).toBe(364);
    });

    it('is null when there is no deadline', () => {
      expect(daysFromToday(null, '2026-10-27')).toBeNull();
    });
  });
});
