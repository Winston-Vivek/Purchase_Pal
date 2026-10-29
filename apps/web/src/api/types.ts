/** Mirrors the API's response shapes (docs/requirements.md §9). */

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  warrantyAlertDays: number;
  returnAlertDays: number;
}

export type DeadlineStatus = 'NOT_SET' | 'EXPIRED' | 'EXPIRING_SOON' | 'ACTIVE';

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
