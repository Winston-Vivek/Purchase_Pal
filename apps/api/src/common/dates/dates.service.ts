import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CLOCK, Clock } from './clock';

/** A calendar date as `YYYY-MM-DD`. Never a timestamp (BR-05). */
export type IsoDate = string;

/** BR-04. Computed per response, never stored. */
export enum DeadlineStatus {
  NOT_SET = 'NOT_SET',
  EXPIRED = 'EXPIRED',
  EXPIRING_SOON = 'EXPIRING_SOON',
  ACTIVE = 'ACTIVE',
}

export interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

export class InvalidDateError extends Error {
  constructor(value: string, reason: string) {
    super(`"${value}" is not a real calendar date — ${reason}. Expected YYYY-MM-DD.`);
    this.name = 'InvalidDateError';
  }
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

/** Days in a 1-based month. Day 0 of the next month is the last of this one. */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function format({ year, month, day }: CalendarDate): IsoDate {
  const pad = (n: number, width: number) => String(n).padStart(width, '0');
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}

/**
 * Every date calculation in Proofly, in one place (CLAUDE.md non-negotiable 6).
 *
 * All arithmetic is done on plain year/month/day numbers and, where a real
 * interval is needed, on UTC midnights. No local-time Date is ever constructed
 * from a business date: that is where off-by-one bugs come from, because the
 * host's zone has nothing to do with the user's.
 */
@Injectable()
export class DatesService {
  private readonly formatter: Intl.DateTimeFormat;

  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    config: ConfigService,
  ) {
    // Built once: constructing an Intl.DateTimeFormat is the expensive part,
    // and today() is called for every computed status on every response.
    this.formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: config.getOrThrow<string>('APP_TIMEZONE'),
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  /**
   * Today in APP_TIMEZONE (BR-05, D-10).
   *
   * Formatting the instant in the target zone is the only approach that stays
   * correct regardless of where the server runs: at 18:31 UTC it is already
   * tomorrow in Kolkata, and a deadline must agree with the user's calendar,
   * not the host's.
   */
  today(): IsoDate {
    // en-CA formats as YYYY-MM-DD, which is the shape we want, so there is no
    // part lookup to get wrong and no unreachable fallback branch. If an
    // environment's locale data ever disagreed, UT-DATE-22 and UT-DATE-23
    // would fail on that machine — which is the behaviour we want from a
    // guard, rather than a silent `?? ''`.
    return this.formatter.format(this.clock.now());
  }

  /**
   * Strict parse. Rejects anything that is not a date that actually happened.
   *
   * This is deliberately not `new Date(value)`: that accepts "2026-02-30" and
   * silently returns 2 March, which would store a warranty against a day that
   * does not exist (UT-DATE-24).
   */
  parseIsoDate(value: string): CalendarDate {
    const match = ISO_DATE.exec(value);
    if (!match) throw new InvalidDateError(value, 'it is not in YYYY-MM-DD form');

    // Slicing the already-matched string rather than reading capture groups:
    // `match[1]` is `string | undefined` under noUncheckedIndexedAccess, and
    // defaulting it would add a branch that can never be taken.
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(5, 7));
    const day = Number(value.slice(8, 10));

    if (month < 1 || month > 12) {
      throw new InvalidDateError(value, `there is no month ${month}`);
    }

    const lastDay = daysInMonth(year, month);
    if (day < 1 || day > lastDay) {
      throw new InvalidDateError(value, `month ${month} of ${year} has ${lastDay} days`);
    }

    return { year, month, day };
  }

  /** Shifts a calendar date by whole days. Negative moves backwards. */
  addDays(date: IsoDate, days: number): IsoDate {
    const { year, month, day } = this.parseIsoDate(date);
    const shifted = new Date(Date.UTC(year, month - 1, day) + days * MS_PER_DAY);

    return format({
      year: shifted.getUTCFullYear(),
      month: shifted.getUTCMonth() + 1,
      day: shifted.getUTCDate(),
    });
  }

  /**
   * BR-01. `addMonths(start, n)` then one day back, because a 12-month warranty
   * bought on 15 Jan covers you through 14 Jan, not into the 15th.
   *
   * The exception is the whole subtlety of the rule: when the start day does
   * not exist in the target month, the answer is that month's last day and the
   * minus-one does NOT apply. 31 Jan + 1 month is 28 Feb, not 27 Feb — any
   * other reading would quietly shorten the cover.
   */
  warrantyExpiry(startDate: IsoDate | null, months: number | null): IsoDate | null {
    if (startDate === null || months === null) return null;

    const start = this.parseIsoDate(startDate);

    const monthsFromYearZero = start.month - 1 + months;
    const year = start.year + Math.floor(monthsFromYearZero / 12);
    const month = (monthsFromYearZero % 12) + 1;

    const lastDay = daysInMonth(year, month);
    if (start.day > lastDay) {
      return format({ year, month, day: lastDay });
    }

    return this.addDays(format({ year, month, day: start.day }), -1);
  }

  /**
   * BR-02. A deadline the user typed wins over the calculated one — they may
   * have been told something different by the seller, and the record should
   * say what they were told.
   */
  returnDeadline(
    purchaseDate: IsoDate,
    returnWindowDays: number | null,
    manualDeadline: IsoDate | null,
  ): IsoDate | null {
    if (manualDeadline !== null) {
      this.parseIsoDate(manualDeadline);
      return manualDeadline;
    }

    if (returnWindowDays === null) return null;

    return this.addDays(purchaseDate, returnWindowDays);
  }

  /**
   * Whole calendar days from today to the deadline. 0 means the deadline is
   * today, which BR-03 counts as still open.
   */
  daysLeft(deadline: IsoDate | null, today: IsoDate = this.today()): number | null {
    if (deadline === null) return null;

    const target = this.parseIsoDate(deadline);
    const from = this.parseIsoDate(today);

    const targetMs = Date.UTC(target.year, target.month - 1, target.day);
    const fromMs = Date.UTC(from.year, from.month - 1, from.day);

    return Math.round((targetMs - fromMs) / MS_PER_DAY);
  }

  /**
   * BR-04. `alertDays` is the user's own window — warrantyAlertDays for a
   * warranty, returnAlertDays for a return — so the same date can be ACTIVE
   * for one user and EXPIRING_SOON for another.
   */
  status(
    deadline: IsoDate | null,
    alertDays: number,
    today: IsoDate = this.today(),
  ): DeadlineStatus {
    const left = this.daysLeft(deadline, today);

    if (left === null) return DeadlineStatus.NOT_SET;
    if (left < 0) return DeadlineStatus.EXPIRED;
    if (left <= alertDays) return DeadlineStatus.EXPIRING_SOON;
    return DeadlineStatus.ACTIVE;
  }
}
