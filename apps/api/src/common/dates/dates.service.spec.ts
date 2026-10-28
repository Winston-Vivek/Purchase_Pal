import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { CLOCK, Clock } from './clock';
import { DatesService, DeadlineStatus, InvalidDateError } from './dates.service';

/**
 * UT-DATE-01..24 from docs/test-cases.md §1.
 *
 * Fixed clock: today = 2026-10-27 in Asia/Kolkata (docs/test-plan.md §5).
 * Every expected value in this file is taken from the test case table, not
 * computed here — a test that derives its own expectation with the same code
 * it is testing proves nothing.
 */

/** 11:30 IST on the fixed test day — comfortably inside 2026-10-27 either way. */
const NOON_IST_ON_TEST_DAY = '2026-10-27T06:00:00Z';

async function buildService(nowIso: string = NOON_IST_ON_TEST_DAY): Promise<DatesService> {
  const clock: Clock = { now: () => new Date(nowIso) };

  const moduleRef: TestingModule = await Test.createTestingModule({
    providers: [
      DatesService,
      { provide: CLOCK, useValue: clock },
      {
        provide: ConfigService,
        useValue: {
          getOrThrow: (key: string) => {
            if (key === 'APP_TIMEZONE') return 'Asia/Kolkata';
            throw new Error(`unexpected config key ${key}`);
          },
        },
      },
    ],
  }).compile();

  return moduleRef.get(DatesService);
}

describe('DatesService', () => {
  let dates: DatesService;

  beforeEach(async () => {
    dates = await buildService();
  });

  // -------------------------------------------------- 1.1 warranty (BR-01) --
  describe('warrantyExpiry — BR-01', () => {
    it('UT-DATE-01 start 2026-01-15 + 12 months is 2027-01-14', () => {
      expect(dates.warrantyExpiry('2026-01-15', 12)).toBe('2027-01-14');
    });

    it('UT-DATE-02 start 2026-01-31 + 1 month clamps to the end of February', () => {
      // February has no 31st, so the rule is "last day of that month" — and
      // notably NOT that day minus one.
      expect(dates.warrantyExpiry('2026-01-31', 1)).toBe('2026-02-28');
    });

    it('UT-DATE-03 leap day 2024-02-29 + 12 months is 2025-02-28', () => {
      expect(dates.warrantyExpiry('2024-02-29', 12)).toBe('2025-02-28');
    });

    it('UT-DATE-04 start 2026-03-31 + 1 month clamps to 2026-04-30', () => {
      expect(dates.warrantyExpiry('2026-03-31', 1)).toBe('2026-04-30');
    });

    it('UT-DATE-05 start 2025-11-02 + 12 months is 2026-11-01', () => {
      expect(dates.warrantyExpiry('2025-11-02', 12)).toBe('2026-11-01');
    });

    it('UT-DATE-06 start 2024-10-20 + 24 months is 2026-10-19', () => {
      expect(dates.warrantyExpiry('2024-10-20', 24)).toBe('2026-10-19');
    });

    it('UT-DATE-07 a missing start date or missing months means no warranty', () => {
      expect(dates.warrantyExpiry(null, 12)).toBeNull();
      expect(dates.warrantyExpiry('2026-01-15', null)).toBeNull();
      expect(dates.warrantyExpiry(null, null)).toBeNull();
    });
  });

  // ---------------------------------------------- 1.2 return deadline (BR-02) --
  describe('returnDeadline — BR-02', () => {
    it('UT-DATE-08 purchase 2026-10-20 with a 7 day window closes 2026-10-27', () => {
      expect(dates.returnDeadline('2026-10-20', 7, null)).toBe('2026-10-27');
    });

    it('UT-DATE-09 a manual deadline overrides the window', () => {
      expect(dates.returnDeadline('2026-10-20', 7, '2026-11-15')).toBe('2026-11-15');
    });

    it('UT-DATE-10 no window and no manual deadline means not set', () => {
      expect(dates.returnDeadline('2026-10-20', null, null)).toBeNull();
    });

    it('UT-DATE-11 a window of 0 days closes on the purchase date itself', () => {
      expect(dates.returnDeadline('2026-10-20', 0, null)).toBe('2026-10-20');
    });

    it('UT-DATE-12 a window that crosses the year end is still correct', () => {
      expect(dates.returnDeadline('2026-12-28', 10, null)).toBe('2027-01-07');
    });
  });

  // ------------------------------------- 1.3 status and days left (BR-03/04) --
  describe('daysLeft and status — BR-03, BR-04, today is 2026-10-27', () => {
    it('UT-DATE-13 a deadline of today has 0 days left and is not expired', () => {
      expect(dates.daysLeft('2026-10-27')).toBe(0);
      expect(dates.status('2026-10-27', 7)).toBe(DeadlineStatus.EXPIRING_SOON);
    });

    it('UT-DATE-14 yesterday is expired, with -1 days left', () => {
      expect(dates.daysLeft('2026-10-26')).toBe(-1);
      expect(dates.status('2026-10-26', 7)).toBe(DeadlineStatus.EXPIRED);
    });

    it('UT-DATE-15 exactly alertDays away is expiring soon (boundary in)', () => {
      expect(dates.daysLeft('2026-11-03')).toBe(7);
      expect(dates.status('2026-11-03', 7)).toBe(DeadlineStatus.EXPIRING_SOON);
    });

    it('UT-DATE-16 one day past alertDays is active (boundary out)', () => {
      expect(dates.daysLeft('2026-11-04')).toBe(8);
      expect(dates.status('2026-11-04', 7)).toBe(DeadlineStatus.ACTIVE);
    });

    it('UT-DATE-17 a warranty 30 days out with a 30 day window is expiring soon', () => {
      expect(dates.daysLeft('2026-11-26')).toBe(30);
      expect(dates.status('2026-11-26', 30)).toBe(DeadlineStatus.EXPIRING_SOON);
    });

    it('UT-DATE-18 a warranty 31 days out with a 30 day window is active', () => {
      expect(dates.daysLeft('2026-11-27')).toBe(31);
      expect(dates.status('2026-11-27', 30)).toBe(DeadlineStatus.ACTIVE);
    });

    it("UT-DATE-19 the user's own 60 day window is used, not the default", () => {
      expect(dates.daysLeft('2026-12-20')).toBe(54);
      expect(dates.status('2026-12-20', 60)).toBe(DeadlineStatus.EXPIRING_SOON);
      // The same date against the default 30 would NOT be expiring soon.
      expect(dates.status('2026-12-20', 30)).toBe(DeadlineStatus.ACTIVE);
    });

    it('UT-DATE-20 a null deadline has no days left and is not set', () => {
      expect(dates.daysLeft(null)).toBeNull();
      expect(dates.status(null, 7)).toBe(DeadlineStatus.NOT_SET);
    });

    it('UT-DATE-21 days left is correct across a month and a year boundary', () => {
      expect(dates.daysLeft('2027-01-14')).toBe(79);
    });
  });

  // ------------------------------------------ 1.4 today in the app zone (BR-05) --
  describe('today — BR-05, D-10, Asia/Kolkata', () => {
    it('UT-DATE-22 23:59 IST is still the same day', async () => {
      // 18:29Z + 05:30 = 23:59 IST on 2026-10-27.
      const service = await buildService('2026-10-27T18:29:00Z');
      expect(service.today()).toBe('2026-10-27');
    });

    it('UT-DATE-23 00:01 IST has already rolled over to the next day', async () => {
      // 18:31Z + 05:30 = 00:01 IST on 2026-10-28.
      const service = await buildService('2026-10-27T18:31:00Z');
      expect(service.today()).toBe('2026-10-28');
    });

    it('UT-DATE-24 an impossible date is rejected, never rolled into March', () => {
      expect(() => dates.parseIsoDate('2026-02-30')).toThrow(InvalidDateError);
      // The failure mode this guards against: `new Date('2026-02-30')` in some
      // engines quietly becomes 2 March. Nothing here may do that.
      expect(() => dates.parseIsoDate('2026-02-30')).toThrow(/not a real calendar date/i);
      expect(() => dates.parseIsoDate('27/10/2026')).toThrow(InvalidDateError);
      expect(() => dates.parseIsoDate('2026-13-01')).toThrow(InvalidDateError);
    });
  });
});
