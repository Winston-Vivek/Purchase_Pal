import { DatesService, DeadlineStatus } from '../common/dates/dates.service';
import { User } from '../users/user.entity';
import { Purchase } from './purchase.entity';

export interface PurchaseResponse {
  id: string;
  productName: string;
  category: string;
  seller: string | null;
  purchaseDate: string;
  price: number;
  currency: string;
  returnWindowDays: number | null;
  warrantyStartDate: string | null;
  warrantyMonths: number | null;
  notes: string | null;
  returnDeadline: string | null;
  returnStatus: DeadlineStatus;
  returnDaysLeft: number | null;
  warrantyExpiry: string | null;
  warrantyStatus: DeadlineStatus;
  warrantyDaysLeft: number | null;
  hasReceipt: boolean;
  attachments?: unknown[];
  serviceRecords?: unknown[];
}

/**
 * The seven computed fields are worked out here, per response (BR-04). The
 * windows come from the user, so the same purchase can read ACTIVE for one
 * person and EXPIRING_SOON for another.
 */
export function toPurchaseResponse(
  purchase: Purchase,
  user: User,
  dates: DatesService,
  options: { includeRelations?: boolean } = {},
): PurchaseResponse {
  const returnDeadline = dates.returnDeadline(
    purchase.purchaseDate,
    purchase.returnWindowDays,
    purchase.returnDeadline,
  );
  const warrantyExpiry = dates.warrantyExpiry(purchase.warrantyStartDate, purchase.warrantyMonths);

  const response: PurchaseResponse = {
    id: purchase.id,
    productName: purchase.productName,
    category: purchase.category,
    seller: purchase.seller,
    purchaseDate: purchase.purchaseDate,
    // Postgres hands DECIMAL back as a string to keep the cents exact; the API
    // sends a number, which is safe well past any realistic price.
    price: Number(purchase.price),
    currency: purchase.currency,
    returnWindowDays: purchase.returnWindowDays,
    warrantyStartDate: purchase.warrantyStartDate,
    warrantyMonths: purchase.warrantyMonths,
    notes: purchase.notes,
    returnDeadline,
    returnStatus: dates.status(returnDeadline, user.returnAlertDays),
    returnDaysLeft: dates.daysLeft(returnDeadline),
    warrantyExpiry,
    warrantyStatus: dates.status(warrantyExpiry, user.warrantyAlertDays),
    warrantyDaysLeft: dates.daysLeft(warrantyExpiry),
    hasReceipt: (purchase.attachments?.length ?? 0) > 0,
  };

  if (options.includeRelations) {
    response.attachments = purchase.attachments ?? [];
    response.serviceRecords = purchase.serviceRecords ?? [];
  }

  return response;
}
