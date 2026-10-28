import { PurchaseResponse } from '../purchases/purchase-response';

export type DeadlineKind = 'RETURN' | 'WARRANTY';

/** One deadline belonging to one purchase. A purchase can contribute two. */
export interface DeadlineItem {
  purchaseId: string;
  productName: string;
  kind: DeadlineKind;
  date: string;
  daysLeft: number;
}

export interface DashboardResponse {
  counts: {
    total: number;
    underWarranty: number;
    openReturns: number;
    needsAction: number;
  };
  needsAction: DeadlineItem[];
  recentlyExpired: DeadlineItem[];
  recentPurchases: PurchaseResponse[];
}
