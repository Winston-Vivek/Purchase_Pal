import { describe, expect, it } from 'vitest';
import { serviceSummary } from './service-column';

/** FE-PAGE-59 from docs/test-cases.md §4 — the Service column's one fact. */
describe('serviceSummary', () => {
  const TODAY = '2026-11-02';
  const at = (last: string | null, next: string | null) =>
    serviceSummary({ lastServiceDate: last, nextServiceDate: next }, TODAY);

  it('FE-PAGE-59 shows nothing when a thing has never been serviced or scheduled', () => {
    expect(at(null, null)).toEqual({ kind: 'NONE' });
  });

  it('FE-PAGE-59 shows the only one it has', () => {
    expect(at('2026-05-01', null)).toEqual({ kind: 'LAST', date: '2026-05-01' });
    expect(at(null, '2027-05-01')).toEqual({ kind: 'UPCOMING', date: '2027-05-01' });
  });

  it('FE-PAGE-59 prefers a service due on Friday over one a year ago', () => {
    expect(at('2025-11-20', '2026-11-06')).toEqual({ kind: 'UPCOMING', date: '2026-11-06' });
  });

  it("FE-PAGE-59 prefers yesterday's visit over one due in nine months", () => {
    expect(at('2026-11-01', '2027-08-01')).toEqual({ kind: 'LAST', date: '2026-11-01' });
  });

  it('FE-PAGE-59 an overdue service still counts as upcoming when it is nearer', () => {
    // Overdue by 2 days, last serviced 6 months ago: the overdue one is the
    // fact worth showing.
    expect(at('2026-05-02', '2026-10-31')).toEqual({ kind: 'UPCOMING', date: '2026-10-31' });
  });

  it('FE-PAGE-59 a tie goes to what is about to happen', () => {
    // Five days either side of today: what is coming is more actionable than
    // what is done.
    expect(at('2026-10-28', '2026-11-07')).toEqual({ kind: 'UPCOMING', date: '2026-11-07' });
  });

  it('FE-PAGE-59 a nearer past visit still wins', () => {
    // Three days ago against five days ahead.
    expect(at('2026-10-30', '2026-11-07')).toEqual({ kind: 'LAST', date: '2026-10-30' });
  });
});
