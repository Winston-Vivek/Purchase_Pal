import { AttachmentResponse, toAttachmentResponse } from '../attachments/attachment-response';
import { DatesService, DeadlineStatus } from '../common/dates/dates.service';
import {
  ServiceRecordResponse,
  toServiceRecordResponse,
} from '../service-records/service-record-response';
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
  nextServiceDate: string | null;
  serviceStatus: DeadlineStatus;
  serviceDaysLeft: number | null;
  warrantyExpiry: string | null;
  warrantyStatus: DeadlineStatus;
  warrantyDaysLeft: number | null;
  hasReceipt: boolean;
  attachments?: AttachmentResponse[];
  serviceRecords?: ServiceRecordResponse[];
}

/**
 * The seven computed fields are worked out here, per response (BR-04). The
 * windows come from the user, so the same purchase can read ACTIVE for one
 * person and EXPIRING_SOON for another.
 */
/**
 * BR-11. A return the user has closed reports CLOSED whatever its deadline
 * says, and stops counting down.
 *
 * One function because three places resolve a return — this mapper, the list
 * projection and the dashboard — and the rule has to hold in all of them or
 * the dashboard would keep nagging about a return the details page calls
 * closed.
 */
/**
 * BR-12. The next service a purchase is due.
 *
 * Servicing a thing again is what resets the clock, so the newest record
 * decides — but a later visit that scheduled nothing must not erase a plan
 * made earlier, so it is the newest record that actually HAS a date. Ordered
 * by service date, then by when it was recorded, because two services on one
 * day are ordinary.
 */
export function nextServiceOf(purchase: Purchase): string | null {
  const scheduled = (purchase.serviceRecords ?? []).filter(
    (record) => record.nextServiceDate !== null,
  );
  if (scheduled.length === 0) return null;

  const newest = scheduled.reduce((latest, record) =>
    record.serviceDate > latest.serviceDate ||
    (record.serviceDate === latest.serviceDate && record.createdAt > latest.createdAt)
      ? record
      : latest,
  );

  return newest.nextServiceDate;
}

export function resolveReturn(
  purchase: Purchase,
  deadline: string | null,
  user: User,
  dates: DatesService,
): { status: DeadlineStatus; daysLeft: number | null } {
  if (purchase.returnClosed) return { status: DeadlineStatus.CLOSED, daysLeft: null };

  return {
    status: dates.status(deadline, user.returnAlertDays),
    daysLeft: dates.daysLeft(deadline),
  };
}

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
  const returned = resolveReturn(purchase, returnDeadline, user, dates);
  const nextServiceDate = nextServiceOf(purchase);

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
    returnStatus: returned.status,
    returnDaysLeft: returned.daysLeft,
    nextServiceDate,
    serviceStatus: dates.status(nextServiceDate, user.serviceAlertDays),
    serviceDaysLeft: dates.daysLeft(nextServiceDate),
    warrantyExpiry,
    warrantyStatus: dates.status(warrantyExpiry, user.warrantyAlertDays),
    warrantyDaysLeft: dates.daysLeft(warrantyExpiry),
    hasReceipt: (purchase.attachments?.length ?? 0) > 0,
  };

  if (options.includeRelations) {
    // Mapped, not raw: a raw Attachment carries storageKey.
    response.attachments = (purchase.attachments ?? []).map(toAttachmentResponse);
    response.serviceRecords = (purchase.serviceRecords ?? []).map(toServiceRecordResponse);
  }

  return response;
}
