import { INestApplication } from '@nestjs/common';
import { join, resolve } from 'node:path';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { signUp } from './utils/auth';
import { createTestApp } from './utils/create-test-app';
import { seedDashboard } from './utils/dashboard-fixture';
import { truncateAll } from './utils/database';

/**
 * API-DASH-01..08 from docs/test-cases.md §2.7 — US-06.
 * Today is pinned to 2026-10-27.
 */
describe('Dashboard (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let cookie: string;

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
  });

  beforeEach(async () => {
    await truncateAll(dataSource);
    ({ cookie } = await signUp(app));
  });

  afterAll(async () => {
    await app.close();
  });

  const dashboard = (as: string = cookie) =>
    request(app.getHttpServer()).get('/api/v1/dashboard').set('Cookie', as);

  it('API-DASH-01 the four counts', async () => {
    await seedDashboard(app, cookie);

    const response = await dashboard().expect(200);

    expect(response.body.counts).toEqual({
      total: 7,
      underWarranty: 5,
      openReturns: 2,
      needsAction: 3,
      // 12995 + 24900 + 8999 + 38990 + 71999 + 124990 + 32499. The dashboard
      // card shows this, and the frontend cannot work it out: it is only sent
      // the five most recent purchases.
      totalValue: 315372,
    });
  });

  it('API-DASH-02 needs action is sorted by fewest days left', async () => {
    await seedDashboard(app, cookie);

    const response = await dashboard().expect(200);

    expect(
      response.body.needsAction.map((i: { productName: string; daysLeft: number }) => [
        i.productName,
        i.daysLeft,
      ]),
    ).toEqual([
      ['Nike Pegasus 41', 4],
      ['Samsung 1.5 Ton Inverter Split AC', 5],
      ['AirPods Pro (2nd generation)', 7],
    ]);
  });

  it('API-DASH-03 each needs-action item says which deadline it is', async () => {
    await seedDashboard(app, cookie);

    const response = await dashboard().expect(200);

    for (const item of response.body.needsAction) {
      expect(item).toEqual({
        purchaseId: expect.any(String),
        productName: expect.any(String),
        kind: expect.stringMatching(/^(RETURN|WARRANTY)$/),
        date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        daysLeft: expect.any(Number),
        // The mockup puts a "Receipt missing" badge on these rows, so the row
        // has to know (BR-06).
        hasReceipt: expect.any(Boolean),
      });
    }

    // The Samsung entry is a warranty, the Nike one is a return — the icon and
    // wording on the dashboard depend on knowing which.
    const kinds = Object.fromEntries(
      response.body.needsAction.map((i: { productName: string; kind: string }) => [
        i.productName,
        i.kind,
      ]),
    );
    expect(kinds['Nike Pegasus 41']).toBe('RETURN');
    expect(kinds['Samsung 1.5 Ton Inverter Split AC']).toBe('WARRANTY');
  });

  it('API-DASH-03 hasReceipt on a needs-action row follows the real attachments', async () => {
    await seedDashboard(app, cookie);

    const all = await request(app.getHttpServer())
      .get('/api/v1/purchases')
      .set('Cookie', cookie)
      .expect(200);
    const airpods = all.body.items.find((p: { productName: string }) =>
      p.productName.startsWith('AirPods'),
    );

    await request(app.getHttpServer())
      .post(`/api/v1/purchases/${airpods.id}/attachments`)
      .set('Cookie', cookie)
      .attach('file', join(resolve(__dirname, 'fixtures'), 'receipt.pdf'))
      .expect(201);

    const response = await dashboard().expect(200);
    const byName = Object.fromEntries(
      response.body.needsAction.map((i: { productName: string; hasReceipt: boolean }) => [
        i.productName,
        i.hasReceipt,
      ]),
    );

    expect(byName['AirPods Pro (2nd generation)']).toBe(true);
    expect(byName['Nike Pegasus 41']).toBe(false);
  });

  it('API-DASH-04 recently expired covers the last 30 days only', async () => {
    await seedDashboard(app, cookie);

    const response = await dashboard().expect(200);

    expect(
      response.body.recentlyExpired.map(
        (i: { productName: string; kind: string; date: string }) => [i.productName, i.kind, i.date],
      ),
    ).toEqual([
      ['Philips Air Fryer', 'RETURN', '2026-10-22'],
      ['LG washing machine', 'WARRANTY', '2026-10-19'],
    ]);
  });

  it('API-DASH-05 recent purchases is the latest five', async () => {
    await seedDashboard(app, cookie);

    const response = await dashboard().expect(200);

    expect(
      response.body.recentPurchases.map((p: { productName: string }) => p.productName),
    ).toEqual([
      'AirPods Pro (2nd generation)',
      'Nike Pegasus 41',
      'Philips Air Fryer',
      'iPhone 15',
      'Samsung 1.5 Ton Inverter Split AC',
    ]);
  });

  it('API-DASH-06 a narrower return window empties the return side of needs action', async () => {
    await seedDashboard(app, cookie);

    await request(app.getHttpServer())
      .patch('/api/v1/users/me/settings')
      .set('Cookie', cookie)
      .send({ returnAlertDays: 3 })
      .expect(200);

    const response = await dashboard().expect(200);

    // Nike (4 days) and AirPods (7) both fall outside a 3 day window. The
    // Samsung warranty is unaffected — it is measured against warrantyAlertDays.
    expect(response.body.needsAction.map((i: { productName: string }) => i.productName)).toEqual([
      'Samsung 1.5 Ton Inverter Split AC',
    ]);
    expect(response.body.counts.needsAction).toBe(1);
  });

  it('API-DASH-07 a new user sees zeroes and empty lists', async () => {
    const response = await dashboard().expect(200);

    expect(response.body.counts).toEqual({
      total: 0,
      underWarranty: 0,
      openReturns: 0,
      needsAction: 0,
      totalValue: 0,
    });
    expect(response.body.needsAction).toEqual([]);
    expect(response.body.recentlyExpired).toEqual([]);
    expect(response.body.recentPurchases).toEqual([]);
  });

  it('API-DASH-09 a return closed by hand leaves needs-action and the open count', async () => {
    await seedDashboard(app, cookie);

    const before = await dashboard().expect(200);
    const target = before.body.needsAction.find(
      (item: { kind: string }) => item.kind === 'RETURN',
    );
    expect(target).toBeDefined();

    await request(app.getHttpServer())
      .patch(`/api/v1/purchases/${target.purchaseId}`)
      .set('Cookie', cookie)
      .send({ returnClosed: true })
      .expect(200);

    const after = await dashboard().expect(200);

    expect(after.body.counts.openReturns).toBe(before.body.counts.openReturns - 1);
    expect(after.body.needsAction.map((i: { purchaseId: string }) => i.purchaseId)).not.toContain(
      target.purchaseId,
    );
    // The purchase itself has not gone anywhere — only the nagging has.
    expect(after.body.counts.total).toBe(before.body.counts.total);
  });

  it("API-DASH-08 B's dashboard counts only B's purchases", async () => {
    await seedDashboard(app, cookie);

    const { cookie: bCookie } = await signUp(app, { email: 'bob@test.dev', name: 'Bob' });
    await request(app.getHttpServer())
      .post('/api/v1/purchases')
      .set('Cookie', bCookie)
      .send({
        productName: "Bob's kettle",
        category: 'HOME_KITCHEN',
        purchaseDate: '2026-10-26',
        price: 1999,
      })
      .expect(201);

    const response = await dashboard(bCookie).expect(200);

    expect(response.body.counts.total).toBe(1);
    expect(JSON.stringify(response.body)).not.toContain('AirPods');
  });
});
