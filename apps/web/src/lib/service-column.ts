import type { PurchaseResponse } from '../api/types';
import { todayIso } from './deadlines';

/**
 * What a purchase's Service column should say.
 *
 * A row has room for one fact, so it shows whichever of the two is nearer to
 * today: a thing serviced yesterday is better described by that than by a
 * service due in nine months, and a thing due for service on Friday is better
 * described by that than by a visit a year ago.
 */
export type ServiceSummary =
  { kind: 'UPCOMING'; date: string } | { kind: 'LAST'; date: string } | { kind: 'NONE' };

const daysBetween = (a: string, b: string): number =>
  Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000;

export function serviceSummary(
  purchase: Pick<PurchaseResponse, 'lastServiceDate' | 'nextServiceDate'>,
  today = todayIso(),
): ServiceSummary {
  const { lastServiceDate: last, nextServiceDate: next } = purchase;

  if (next === null && last === null) return { kind: 'NONE' };
  if (next === null) return { kind: 'LAST', date: last! };
  if (last === null) return { kind: 'UPCOMING', date: next };

  // Ties go to the upcoming one: what is about to happen is more actionable
  // than what already has.
  return daysBetween(next, today) <= daysBetween(last, today)
    ? { kind: 'UPCOMING', date: next }
    : { kind: 'LAST', date: last };
}
