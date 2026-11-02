import { INestApplication } from '@nestjs/common';
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { signUp } from './utils/auth';
import { createTestApp } from './utils/create-test-app';
import { truncateAll } from './utils/database';

/**
 * API-PUR-01..30 from docs/test-cases.md §2.4 — US-02, US-04, US-05, US-09.
 * Today is pinned to 2026-10-27 (Asia/Kolkata).
 */

const UPLOAD_DIR = resolve(process.env.UPLOAD_DIR ?? './var/uploads-test');
const FIXTURE = join(resolve(__dirname, 'fixtures'), 'receipt.pdf');

const storedFiles = (): string[] => (existsSync(UPLOAD_DIR) ? readdirSync(UPLOAD_DIR) : []);

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

  // ------------------------------------------- BR-12 next service due -----
  describe('BR-12 the next service a purchase is due', () => {
    const service = (purchaseId: string, body: Record<string, unknown>) =>
      request(app.getHttpServer())
        .post(`/api/v1/purchases/${purchaseId}/services`)
        .set('Cookie', cookie)
        .send(body);

    const get = (id: string) =>
      request(app.getHttpServer()).get(`/api/v1/purchases/${id}`).set('Cookie', cookie);

    /** Bought in January, so a service in January is legal: §7 refuses a
     *  service before the purchase it repaired. */
    const buyInJanuary = async (): Promise<string> => {
      const created = await request(app.getHttpServer())
        .post('/api/v1/purchases')
        .set('Cookie', cookie)
        .send({ ...BASE, purchaseDate: '2026-01-05' })
        .expect(201);

      return (created.body as { id: string }).id;
    };

    it('API-PUR-37 the newest service decides when the next one is due', async () => {
      const id = await buyInJanuary();

      // Serviced in January, due again in June; serviced again in October,
      // due again in November. The October visit is what resets the clock.
      await service(id, {
        serviceDate: '2026-01-10',
        description: 'First service',
        nextServiceDate: '2026-06-10',
      }).expect(201);
      await service(id, {
        serviceDate: '2026-10-20',
        description: 'Second service',
        nextServiceDate: '2026-11-03',
      }).expect(201);

      const response = await get(id).expect(200);

      expect(response.body.nextServiceDate).toBe('2026-11-03');
      // 27 Oct to 3 Nov, inclusive of the last day (BR-03).
      expect(response.body.serviceDaysLeft).toBe(7);
      expect(response.body.serviceStatus).toBe('EXPIRING_SOON');
    });

    it('API-PUR-38 the newest record that HAS a date is the one that counts', async () => {
      const id = await buyInJanuary();

      await service(id, {
        serviceDate: '2026-01-10',
        description: 'Scheduled service',
        nextServiceDate: '2026-12-01',
      }).expect(201);
      // A later visit that scheduled nothing must not erase the plan.
      await service(id, { serviceDate: '2026-10-20', description: 'Unplanned repair' }).expect(201);

      const response = await get(id).expect(200);

      expect(response.body.nextServiceDate).toBe('2026-12-01');
      expect(response.body.serviceStatus).toBe('ACTIVE');
    });

    it('API-PUR-38 a purchase with no service dates schedules nothing', async () => {
      const id = await buyInJanuary();
      await service(id, { serviceDate: '2026-10-20', description: 'Repair' }).expect(201);

      const response = await get(id).expect(200);

      expect(response.body.nextServiceDate).toBeNull();
      expect(response.body.serviceStatus).toBe('NOT_SET');
      expect(response.body.serviceDaysLeft).toBeNull();
    });

    it('API-PUR-37 a service date already past reads as overdue', async () => {
      const id = await buyInJanuary();
      await service(id, {
        serviceDate: '2026-01-10',
        description: 'Service',
        nextServiceDate: '2026-10-01',
      }).expect(201);

      const response = await get(id).expect(200);

      expect(response.body.serviceStatus).toBe('EXPIRED');
      expect(response.body.serviceDaysLeft).toBe(-26);
    });
  });

  // -------------------------------------------- BR-11 closing a return ----
  describe('BR-11 a return closed by hand', () => {
    const patch = (id: string, body: object, as = cookie) =>
      request(app.getHttpServer()).patch(`/api/v1/purchases/${id}`).set('Cookie', as).send(body);

    it('API-PUR-33 closing a return reports CLOSED and stops the countdown', async () => {
      const created = await create().expect(201);
      expect(created.body.returnStatus).toBe('EXPIRING_SOON');
      expect(created.body.returnDaysLeft).toBe(7);

      const closed = await patch(created.body.id, { returnClosed: true }).expect(200);

      expect(closed.body.returnStatus).toBe('CLOSED');
      expect(closed.body.returnDaysLeft).toBeNull();
      // The deadline itself is a fact about the purchase and is never rewritten.
      expect(closed.body.returnDeadline).toBe(created.body.returnDeadline);
    });

    it('API-PUR-34 reopening it restores the computed status exactly', async () => {
      const created = await create().expect(201);
      await patch(created.body.id, { returnClosed: true }).expect(200);

      const reopened = await patch(created.body.id, { returnClosed: false }).expect(200);

      expect(reopened.body.returnStatus).toBe(created.body.returnStatus);
      expect(reopened.body.returnDaysLeft).toBe(created.body.returnDaysLeft);
    });

    it('API-PUR-35 CLOSED wins over an expired deadline', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/v1/purchases')
        .set('Cookie', cookie)
        .send({ ...BASE, purchaseDate: '2026-09-01', returnWindowDays: 7 })
        .expect(201);
      expect(created.body.returnStatus).toBe('EXPIRED');

      const closed = await patch(created.body.id, { returnClosed: true }).expect(200);

      expect(closed.body.returnStatus).toBe('CLOSED');
      expect(closed.body.returnDaysLeft).toBeNull();
    });

    it("API-PUR-36 B cannot close A's return", async () => {
      const created = await create().expect(201);
      const { cookie: bCookie } = await signUp(app, { email: 'b-closes@proofly.test' });

      await patch(created.body.id, { returnClosed: true }, bCookie).expect(404);

      const mine = await request(app.getHttpServer())
        .get(`/api/v1/purchases/${created.body.id}`)
        .set('Cookie', cookie)
        .expect(200);
      expect(mine.body.returnStatus).toBe('EXPIRING_SOON');
    });

    it('API-PUR-33 a closed return can still be found by filtering for it', async () => {
      const created = await create().expect(201);
      await patch(created.body.id, { returnClosed: true }).expect(200);

      const response = await request(app.getHttpServer())
        .get('/api/v1/purchases?returnStatus=CLOSED')
        .set('Cookie', cookie)
        .expect(200);

      expect(response.body.items.map((p: { id: string }) => p.id)).toEqual([created.body.id]);
    });
  });

  // --------------------------------------------------- BR-08 cascade ------
  describe('BR-08 cascade', () => {
    const upload = (purchaseId: string) =>
      request(app.getHttpServer())
        .post(`/api/v1/purchases/${purchaseId}/attachments`)
        .set('Cookie', cookie)
        .attach('file', FIXTURE);

    const addService = (purchaseId: string, description: string) =>
      request(app.getHttpServer())
        .post(`/api/v1/purchases/${purchaseId}/services`)
        .set('Cookie', cookie)
        .send({ serviceDate: '2026-10-27', description });

    beforeEach(() => {
      rmSync(UPLOAD_DIR, { recursive: true, force: true });
    });

    it('API-PUR-31 deleting a purchase removes its receipts, its history and the files', async () => {
      const created = await create().expect(201);
      const id = created.body.id;

      await upload(id).expect(201);
      await upload(id).expect(201);
      await addService(id, 'First repair').expect(201);
      await addService(id, 'Second repair').expect(201);

      expect(storedFiles()).toHaveLength(2);

      // A second purchase with its own receipt, so the test proves the delete
      // is targeted rather than simply emptying everything.
      const survivor = await create({ ...BASE, productName: 'Survivor' }).expect(201);
      await upload(survivor.body.id).expect(201);
      expect(storedFiles()).toHaveLength(3);

      await request(app.getHttpServer())
        .delete(`/api/v1/purchases/${id}`)
        .set('Cookie', cookie)
        .expect(204);

      const attachments = await dataSource.query<{ count: string }[]>(
        'SELECT COUNT(*)::int AS count FROM attachments WHERE purchase_id = $1',
        [id],
      );
      const services = await dataSource.query<{ count: string }[]>(
        'SELECT COUNT(*)::int AS count FROM service_records WHERE purchase_id = $1',
        [id],
      );

      expect(attachments[0]?.count).toBe(0);
      expect(services[0]?.count).toBe(0);

      // The two files are gone from disk; the survivor's is untouched.
      expect(storedFiles()).toHaveLength(1);

      await get(survivor.body.id).expect(200);
    });

    it('API-PUR-32 hasReceipt turns true on upload and false again on delete', async () => {
      const created = await create().expect(201);
      expect(created.body.hasReceipt).toBe(false);

      const uploaded = await upload(created.body.id).expect(201);
      expect((await get(created.body.id).expect(200)).body.hasReceipt).toBe(true);

      await request(app.getHttpServer())
        .delete(`/api/v1/attachments/${uploaded.body.id}`)
        .set('Cookie', cookie)
        .expect(204);

      expect((await get(created.body.id).expect(200)).body.hasReceipt).toBe(false);
    });
  });
});
