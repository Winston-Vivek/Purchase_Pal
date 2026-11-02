/** Mirrors the API's response shapes (docs/requirements.md §9). */

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  warrantyAlertDays: number;
  returnAlertDays: number;
  serviceAlertDays: number;
}

/** CLOSED is returns only (BR-11): the user said they are keeping the item. */
export type DeadlineStatus = 'NOT_SET' | 'EXPIRED' | 'EXPIRING_SOON' | 'ACTIVE' | 'CLOSED';

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
  scheduledServiceDate: string | null;
  lastServiceDate: string | null;
  nextServiceDate: string | null;
  serviceStatus: DeadlineStatus;
  serviceDaysLeft: number | null;
  warrantyExpiry: string | null;
  warrantyStatus: DeadlineStatus;
  warrantyDaysLeft: number | null;
  hasReceipt: boolean;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const CATEGORIES = [
  ['ELECTRONICS', 'Electronics'],
  ['APPLIANCES', 'Appliances'],
  ['MOBILE', 'Mobile'],
  ['FURNITURE', 'Furniture'],
  ['FASHION', 'Fashion'],
  ['VEHICLE', 'Vehicle'],
  ['HOME_KITCHEN', 'Home & kitchen'],
  ['OTHER', 'Other'],
] as const;

/** The words the form offered, for anywhere a stored category is displayed.
 *  An unknown value is returned as-is rather than hidden. */
export function categoryLabel(value: string): string {
  return CATEGORIES.find(([stored]) => stored === value)?.[1] ?? value;
}

export interface AttachmentResponse {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
}

export interface ServiceRecordResponse {
  id: string;
  purchaseId: string;
  serviceDate: string;
  nextServiceDate: string | null;
  description: string;
  provider: string | null;
  cost: number | null;
  notes: string | null;
}

export interface PurchaseDetail extends PurchaseResponse {
  attachments: AttachmentResponse[];
  serviceRecords: ServiceRecordResponse[];
}
