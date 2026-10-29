import { PurchaseResponse } from '../purchases/purchase-response';

export type DeadlineKind = 'RETURN' | 'WARRANTY';

/** One deadline belonging to one purchase. A purchase can contribute two. */
export interface DeadlineItem {
  purchaseId: string;
  productName: string;
  kind: DeadlineKind;
  date: string;
  daysLeft: number;
  /** BR-06: the row carries a "Receipt missing" badge, so it has to know. */
  hasReceipt: boolean;
}

export interface DashboardResponse {
  counts: {
    total: number;
    underWarranty: number;
    openReturns: number;
    needsAction: number;
    /** Sum of every purchase price. The card shows it and the frontend cannot
     *  work it out — it is only sent the five most recent purchases. */
    totalValue: number;
  };
  needsAction: DeadlineItem[];
  recentlyExpired: DeadlineItem[];
  recentPurchases: PurchaseResponse[];
}
