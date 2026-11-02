import { Injectable } from '@nestjs/common';
import { DatesService, DeadlineStatus } from '../common/dates/dates.service';
import { Purchase } from '../purchases/purchase.entity';
import { nextServiceOf, resolveReturn, toPurchaseResponse } from '../purchases/purchase-response';
import { PurchaseRepository } from '../repositories/purchase/purchase.repository';
import { User } from '../users/user.entity';
import { DashboardResponse, DeadlineItem, DeadlineKind } from './dashboard-response';

/** BR-04 calls anything still open "under warranty" or "open" — both ACTIVE
 *  and EXPIRING_SOON count, because a deadline that has not passed has not
 *  passed. */
const OPEN = [DeadlineStatus.ACTIVE, DeadlineStatus.EXPIRING_SOON];

/** US-06: "Recently expired" means the last 30 days. */
const RECENTLY_EXPIRED_DAYS = 30;

const RECENT_PURCHASES = 5;

interface Resolved {
  purchase: Purchase;
  returnDeadline: string | null;
  returnStatus: DeadlineStatus;
  returnDaysLeft: number | null;
  nextServiceDate: string | null;
  serviceStatus: DeadlineStatus;
  serviceDaysLeft: number | null;
  warrantyExpiry: string | null;
  warrantyStatus: DeadlineStatus;
  warrantyDaysLeft: number | null;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly purchases: PurchaseRepository,
    private readonly dates: DatesService,
  ) {}

  /**
   * Loads the user's purchases once and resolves every deadline in memory.
   *
   * The org template says to filter at the database layer, and normally that
   * is right. It is not possible here without a second implementation of
   * BR-01 in SQL: Postgres clamps `date + interval '1 month'` to the month end
   * and our rule then does NOT subtract a day, so a WHERE clause would quietly
   * disagree with DatesService for exactly the dates the unit tests exist to
   * pin (UT-DATE-02/03/04). CLAUDE.md keeps all date maths in one module, and
   * one correct implementation beats two that drift.
   *
   * The cost is bounded: one indexed query per user, for their own purchases.
   * If a user ever holds enough purchases for this to matter, the answer is a
   * generated column for the resolved deadlines, computed by the same rules —
   * not a hand-written date expression in a query.
   */
  async summarise(user: User): Promise<DashboardResponse> {
    const purchases = await this.purchases.findAllForUser(user.id);
    const rows = purchases.map((purchase) => this.resolve(purchase, user));

    const needsAction = this.deadlines(rows, DeadlineStatus.EXPIRING_SOON).sort(
      (a, b) => a.daysLeft - b.daysLeft,
    );

    const recentlyExpired = this.deadlines(rows, DeadlineStatus.EXPIRED)
      .filter((item) => item.daysLeft >= -RECENTLY_EXPIRED_DAYS)
      // Most recently expired first: the closest to still being actionable.
      .sort((a, b) => b.date.localeCompare(a.date));

    return {
      counts: {
        total: rows.length,
        totalValue: this.totalValue(purchases),
        underWarranty: rows.filter((r) => OPEN.includes(r.warrantyStatus)).length,
        openReturns: rows.filter((r) => OPEN.includes(r.returnStatus)).length,
        needsAction: needsAction.length,
      },
      needsAction,
      recentlyExpired,
      recentPurchases: rows
        .slice(0, RECENT_PURCHASES)
        .map((r) => toPurchaseResponse(r.purchase, user, this.dates)),
    };
  }

  /** Summed in paise, then converted back. Adding DECIMAL values as floats is
   *  how a total ends up at 315371.99999999994. */
  private totalValue(purchases: Purchase[]): number {
    const paise = purchases.reduce((sum, p) => sum + Math.round(Number(p.price) * 100), 0);
    return paise / 100;
  }

  private resolve(purchase: Purchase, user: User): Resolved {
    const returnDeadline = this.dates.returnDeadline(
      purchase.purchaseDate,
      purchase.returnWindowDays,
      purchase.returnDeadline,
    );
    const warrantyExpiry = this.dates.warrantyExpiry(
      purchase.warrantyStartDate,
      purchase.warrantyMonths,
    );
    const returned = resolveReturn(purchase, returnDeadline, user, this.dates);
    const nextServiceDate = nextServiceOf(purchase);

    return {
      purchase,
      returnDeadline,
      returnStatus: returned.status,
      returnDaysLeft: returned.daysLeft,
      nextServiceDate,
      serviceStatus: this.dates.status(nextServiceDate, user.serviceAlertDays),
      serviceDaysLeft: this.dates.daysLeft(nextServiceDate),
      warrantyExpiry,
      warrantyStatus: this.dates.status(warrantyExpiry, user.warrantyAlertDays),
      warrantyDaysLeft: this.dates.daysLeft(warrantyExpiry),
    };
  }

  /** Flattens purchases into deadlines: one purchase can contribute both a
   *  return and a warranty, and they are listed separately because the user
   *  acts on them separately. */
  private deadlines(rows: Resolved[], status: DeadlineStatus): DeadlineItem[] {
    const items: DeadlineItem[] = [];

    for (const row of rows) {
      const add = (kind: DeadlineKind, date: string | null, daysLeft: number | null): void => {
        if (date === null || daysLeft === null) return;
        items.push({
          purchaseId: row.purchase.id,
          productName: row.purchase.productName,
          kind,
          date,
          daysLeft,
          hasReceipt: (row.purchase.attachments?.length ?? 0) > 0,
        });
      };

      if (row.returnStatus === status) add('RETURN', row.returnDeadline, row.returnDaysLeft);
      if (row.warrantyStatus === status) add('WARRANTY', row.warrantyExpiry, row.warrantyDaysLeft);
      if (row.serviceStatus === status) add('SERVICE', row.nextServiceDate, row.serviceDaysLeft);
    }

    return items;
  }
}
