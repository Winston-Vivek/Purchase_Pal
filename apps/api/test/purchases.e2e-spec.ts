import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { signUp } from './utils/auth';
import { createTestApp } from './utils/create-test-app';
import { truncateAll } from './utils/database';

/**
 * API-PUR-01..30 from docs/test-cases.md §2.4 — US-02, US-04, US-05, US-09.
 * Today is pinned to 2026-10-27 (Asia/Kolkata).
 */

const BASE = {
  productName: 'AirPods Pro (2nd generation)',
  category: 'ELECTRONICS',
  seller: 'Amazon',
  purchaseDate: '2026-10-27',
  price: 24900,
  returnWindowDays: 7,
  warrantyStartDate: '2026-10-27',
  warrantyMonths: 12,
};

describe('Purchases (e2e)', () => {
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

  const create = (body: Record<string, unknown> = BASE, as: string = cookie) =>
    request(app.getHttpServer()).post('/api/v1/purchases').set('Cookie', as).send(body);

  const get = (id: string, as: string = cookie) =>
    request(app.getHttpServer()).get(`/api/v1/purchases/${id}`).set('Cookie', as);

  const list = (query = '', as: string = cookie) =>
    request(app.getHttpServer()).get(`/api/v1/purchases${query}`).set('Cookie', as);

  /** Asserts 400 and that the named field is the one reported. */
  const expectFieldError = async (body: Record<string, unknown>, field: string) => {
    const response = await create(body).expect(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.fields).toHaveProperty(field);
  };

  // ------------------------------------------------------------ create ----
  it('API-PUR-01 a valid purchase is created and comes back in full', async () => {
    const response = await create().expect(201);

    expect(response.body).toMatchObject({
      productName: BASE.productName,
      category: 'ELECTRONICS',
      seller: 'Amazon',
      purchaseDate: '2026-10-27',
      price: 24900,
      currency: 'INR',
      returnWindowDays: 7,
      warrantyStartDate: '2026-10-27',
      warrantyMonths: 12,
    });
    expect(typeof response.body.id).toBe('string');
  });

  it('API-PUR-02 every computed field follows BR-01, BR-02 and BR-04', async () => {
    const response = await create().expect(201);

    expect(response.body).toMatchObject({
      returnDeadline: '2026-11-03',
      returnStatus: 'EXPIRING_SOON',
      returnDaysLeft: 7,
      warrantyExpiry: '2027-10-26',
      warrantyStatus: 'ACTIVE',
      warrantyDaysLeft: 364,
      hasReceipt: false,
    });
  });

  it('API-PUR-03 with neither window nor warranty, both statuses are NOT_SET', async () => {
    const response = await create({
      productName: 'Desk lamp',
      category: 'HOME_KITCHEN',
      purchaseDate: '2026-10-20',
      price: 1499,
    }).expect(201);

    expect(response.body).toMatchObject({
      returnDeadline: null,
      returnStatus: 'NOT_SET',
      returnDaysLeft: null,
      warrantyExpiry: null,
      warrantyStatus: 'NOT_SET',
      warrantyDaysLeft: null,
    });
  });

  // -------------------------------------------------------- validation ----
  it('API-PUR-04 productName is required', async () => {
    const { productName: _omitted, ...body } = BASE;
    await expectFieldError(body, 'productName');
  });

  it('API-PUR-05 productName over 120 characters is rejected', async () => {
    await expectFieldError({ ...BASE, productName: 'x'.repeat(121) }, 'productName');
  });

  it('API-PUR-06 an unknown category is rejected', async () => {
    await expectFieldError({ ...BASE, category: 'TOYS' }, 'category');
  });

  it('API-PUR-07 a purchase date in the future is rejected', async () => {
    await expectFieldError({ ...BASE, purchaseDate: '2026-10-28' }, 'purchaseDate');
  });

  it('API-PUR-08 a date that never happened, or the wrong format, is rejected', async () => {
    await expectFieldError({ ...BASE, purchaseDate: '2026-02-30' }, 'purchaseDate');
    await expectFieldError({ ...BASE, purchaseDate: '27/10/2026' }, 'purchaseDate');
  });

  it('API-PUR-09 a negative price is rejected', async () => {
    await expectFieldError({ ...BASE, price: -1 }, 'price');
  });

  it('API-PUR-10 a price with three decimals is rejected', async () => {
    await expectFieldError({ ...BASE, price: 10.999 }, 'price');
  });

  it('API-PUR-11 a return window over 365 days is rejected', async () => {
    await expectFieldError({ ...BASE, returnWindowDays: 366 }, 'returnWindowDays');
  });

  it('API-PUR-12 a return deadline before the purchase date is rejected', async () => {
    await expectFieldError({ ...BASE, returnDeadline: '2026-10-26' }, 'returnDeadline');
  });

  it('API-PUR-13 warrantyMonths without a start date is rejected', async () => {
    const { warrantyStartDate: _omitted, ...body } = BASE;
    await expectFieldError(body, 'warrantyStartDate');
  });

  it('API-PUR-14 a warranty start date without months is rejected', async () => {
    const { warrantyMonths: _omitted, ...body } = BASE;
    await expectFieldError(body, 'warrantyMonths');
  });

  it('API-PUR-15 a warranty starting before the purchase is rejected', async () => {
    await expectFieldError({ ...BASE, warrantyStartDate: '2026-10-26' }, 'warrantyStartDate');
  });

  it('API-PUR-16 warrantyMonths outside 1-120 is rejected', async () => {
    await expectFieldError({ ...BASE, warrantyMonths: 0 }, 'warrantyMonths');
    await expectFieldError({ ...BASE, warrantyMonths: 121 }, 'warrantyMonths');
  });

  it('API-PUR-17 a currency that is not an ISO 4217 code is rejected', async () => {
    await expectFieldError({ ...BASE, currency: 'RUPEE' }, 'currency');
  });

  it('API-PUR-18 notes over 1000 characters are rejected', async () => {
    await expectFieldError({ ...BASE, notes: 'x'.repeat(1001) }, 'notes');
  });

  // ------------------------------------------------ deadlines and status ---
  it('API-PUR-19 a manual deadline overrides the window', async () => {
    const response = await create({ ...BASE, returnDeadline: '2026-11-15' }).expect(201);

    expect(response.body.returnDeadline).toBe('2026-11-15');
  });

  it('API-PUR-20 a window that already closed reads EXPIRED with negative days', async () => {
    const response = await create({
      ...BASE,
      purchaseDate: '2026-10-12',
      returnWindowDays: 10,
      warrantyStartDate: '2026-10-12',
    }).expect(201);

    expect(response.body).toMatchObject({
      returnDeadline: '2026-10-22',
      returnStatus: 'EXPIRED',
      returnDaysLeft: -5,
    });
  });

  // -------------------------------------------------------------- list ----
  it('API-PUR-21 the list is paginated and newest first', async () => {
    await create({ ...BASE, purchaseDate: '2026-10-20', warrantyStartDate: '2026-10-20' }).expect(
      201,
    );
    await create({ ...BASE, purchaseDate: '2026-10-27', warrantyStartDate: '2026-10-27' }).expect(
      201,
    );
    await create({ ...BASE, purchaseDate: '2026-10-24', warrantyStartDate: '2026-10-24' }).expect(
      201,
    );

    const response = await list().expect(200);

    expect(response.body).toMatchObject({ total: 3, page: 1, pageSize: 20 });
    expect(response.body.items.map((p: { purchaseDate: string }) => p.purchaseDate)).toEqual([
      '2026-10-27',
      '2026-10-24',
      '2026-10-20',
    ]);
  });

  it('API-PUR-22 a page size over 50 is rejected', async () => {
    await list('?pageSize=51').expect(400);
  });

  it('API-PUR-23 fetching one purchase includes its (empty) relations', async () => {
    const created = await create().expect(201);

    const response = await get(created.body.id).expect(200);

    expect(response.body.attachments).toEqual([]);
    expect(response.body.serviceRecords).toEqual([]);
  });

  it('API-PUR-24 a malformed id is a client error, never a 500', async () => {
    const response = await get('not-a-uuid');

    expect([400, 404]).toContain(response.status);
  });

  // ------------------------------------------------------ update/delete ----
  it('API-PUR-25 changing warrantyMonths recomputes the expiry and persists', async () => {
    const created = await create().expect(201);

    const patched = await request(app.getHttpServer())
      .patch(`/api/v1/purchases/${created.body.id}`)
      .set('Cookie', cookie)
      .send({ warrantyMonths: 24 })
      .expect(200);

    expect(patched.body.warrantyExpiry).toBe('2028-10-26');

    const reread = await get(created.body.id).expect(200);
    expect(reread.body.warrantyExpiry).toBe('2028-10-26');
  });

  it('API-PUR-26 a patch that breaks a cross-field rule is rejected', async () => {
    const created = await create().expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/purchases/${created.body.id}`)
      .set('Cookie', cookie)
      .send({ warrantyStartDate: null })
      .expect(400);
  });

  it('API-PUR-27 deleting a purchase removes it', async () => {
    const created = await create().expect(201);

    await request(app.getHttpServer())
      .delete(`/api/v1/purchases/${created.body.id}`)
      .set('Cookie', cookie)
      .expect(204);

    await get(created.body.id).expect(404);
  });

  // ----------------------------------------------------------- privacy ----
  describe('BR-09 ownership', () => {
    let aPurchaseId: string;
    let bCookie: string;

    beforeEach(async () => {
      const created = await create().expect(201);
      aPurchaseId = created.body.id;
      ({ cookie: bCookie } = await signUp(app, { email: 'bob@test.dev', name: 'Bob' }));
    });

    it("API-PUR-28 B gets 404, not 403, for A's purchase", async () => {
      const response = await get(aPurchaseId, bCookie).expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(JSON.stringify(response.body)).not.toContain('AirPods');
    });

    it("API-PUR-29 B cannot patch or delete A's purchase", async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/purchases/${aPurchaseId}`)
        .set('Cookie', bCookie)
        .send({ productName: 'Stolen' })
        .expect(404);

      await request(app.getHttpServer())
        .delete(`/api/v1/purchases/${aPurchaseId}`)
        .set('Cookie', bCookie)
        .expect(404);

      const stillThere = await get(aPurchaseId).expect(200);
      expect(stillThere.body.productName).toBe(BASE.productName);
    });

    it("API-PUR-30 B's list never contains A's purchases", async () => {
      const response = await list('', bCookie).expect(200);

      expect(response.body.total).toBe(0);
      expect(response.body.items).toEqual([]);
    });
  });
});
