import { INestApplication } from '@nestjs/common';
import request from 'supertest';

/**
 * The seven purchases from docs/test-cases.md §2.7, which mirror the design
 * mockups. Every date is absolute because the e2e clock is pinned to
 * 2026-10-27 — these numbers only mean anything against that day.
 *
 * Derived values, by BR-01 and BR-02:
 *   Nike      return 2026-10-31   4 days left    no warranty
 *   AirPods   return 2026-11-03   7 days left    warranty 2027-10-26
 *   Air fryer return 2026-10-22  -5 days (shut)  warranty 2028-10-11
 *   Samsung   no return                          warranty 2026-11-01   5 days
 *   iPhone    no return                          warranty 2027-01-14  79 days
 *   Dell      no return                          warranty 2027-03-09
 *   LG        no return                          warranty 2026-10-19  ended
 */
export const DASHBOARD_PURCHASES = [
  {
    productName: 'Nike Pegasus 41',
    category: 'FASHION',
    purchaseDate: '2026-10-24',
    price: 12995,
    returnWindowDays: 7,
  },
  {
    productName: 'AirPods Pro (2nd generation)',
    category: 'ELECTRONICS',
    seller: 'Amazon',
    purchaseDate: '2026-10-27',
    price: 24900,
    returnWindowDays: 7,
    warrantyStartDate: '2026-10-27',
    warrantyMonths: 12,
  },
  {
    productName: 'Philips Air Fryer',
    category: 'HOME_KITCHEN',
    purchaseDate: '2026-10-12',
    price: 8999,
    returnWindowDays: 10,
    warrantyStartDate: '2026-10-12',
    warrantyMonths: 24,
  },
  {
    productName: 'Samsung 1.5 Ton Inverter Split AC',
    category: 'APPLIANCES',
    seller: 'Croma',
    purchaseDate: '2025-11-02',
    price: 38990,
    warrantyStartDate: '2025-11-02',
    warrantyMonths: 12,
  },
  {
    productName: 'iPhone 15',
    category: 'MOBILE',
    purchaseDate: '2026-01-15',
    price: 71999,
    warrantyStartDate: '2026-01-15',
    warrantyMonths: 12,
  },
  {
    productName: 'Dell XPS 13',
    category: 'ELECTRONICS',
    purchaseDate: '2025-03-10',
    price: 124990,
    warrantyStartDate: '2025-03-10',
    warrantyMonths: 24,
  },
  {
    productName: 'LG washing machine',
    category: 'APPLIANCES',
    purchaseDate: '2024-10-20',
    price: 32499,
    warrantyStartDate: '2024-10-20',
    warrantyMonths: 24,
  },
];

export async function seedDashboard(app: INestApplication, cookie: string): Promise<void> {
  for (const purchase of DASHBOARD_PURCHASES) {
    await request(app.getHttpServer())
      .post('/api/v1/purchases')
      .set('Cookie', cookie)
      .send(purchase)
      .expect(201);
  }
}
