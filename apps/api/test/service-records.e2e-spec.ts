import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { signUp } from './utils/auth';
import { createTestApp } from './utils/create-test-app';
import { truncateAll } from './utils/database';

/**
 * API-SVC-01..10 from docs/test-cases.md §2.6 — US-07, BR-07.
 *
 * Today is pinned to 2026-10-27. The purchase below is dated 2026-10-20, so a
 * service record has a real window to be valid in: on or after the purchase,
 * on or before today.
 */
describe('Service records (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let cookie: string;
  let purchaseId: string;

  const VALID = {
    serviceDate: '2026-10-25',
    description: 'Replaced the cooling fan',
    provider: 'Croma Service Centre',
    cost: 1450.5,
  };

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
  });

  const createPurchase = (as: string, purchaseDate = '2026-10-20') =>
    request(app.getHttpServer())
      .post('/api/v1/purchases')
      .set('Cookie', as)
      .send({
        productName: 'Philips Air Fryer',
        category: 'HOME_KITCHEN',
        purchaseDate,
        price: 8999,
      })
      .expect(201);

  beforeEach(async () => {
    await truncateAll(dataSource);
    ({ cookie } = await signUp(app));
    purchaseId = (await createPurchase(cookie)).body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  const add = (body: Record<string, unknown> = VALID, as: string = cookie, target = purchaseId) =>
    request(app.getHttpServer())
      .post(`/api/v1/purchases/${target}/services`)
      .set('Cookie', as)
      .send(body);

  const listFor = (target: string, as: string = cookie) =>
    request(app.getHttpServer()).get(`/api/v1/purchases/${target}/services`).set('Cookie', as);

  // BR-12. Today is pinned to 2026-10-27 in this suite.
  describe('BR-12 next service due', () => {
    it('API-SVC-11 a record can say when the next service is due', async () => {
      const response = await add({ ...VALID, nextServiceDate: '2027-04-25' }).expect(201);

      expect(response.body.nextServiceDate).toBe('2027-04-25');
    });

    it('API-SVC-12 a next service before the service itself is rejected', async () => {
      const response = await add({ ...VALID, nextServiceDate: '2026-10-24' }).expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.fields).toHaveProperty('nextServiceDate');
    });

    it('API-SVC-11 the same day is allowed: a service can be due again at once', async () => {
      await add({ ...VALID, nextServiceDate: '2026-10-25' }).expect(201);
    });

    it('API-SVC-11 leaving it out keeps the record and schedules nothing', async () => {
      const response = await add(VALID).expect(201);

      expect(response.body.nextServiceDate).toBeNull();
    });
  });

  it('API-SVC-01 a valid service record is added', async () => {
    const response = await add().expect(201);

    expect(response.body).toMatchObject({
      serviceDate: '2026-10-25',
      description: VALID.description,
      provider: VALID.provider,
      cost: 1450.5,
    });
    expect(typeof response.body.id).toBe('string');
  });

  it('API-SVC-02 history is newest first, and only this purchase’s records', async () => {
    await add({ ...VALID, serviceDate: '2026-10-22', description: 'First visit' }).expect(201);
    await add({ ...VALID, serviceDate: '2026-10-26', description: 'Second visit' }).expect(201);

    // A different purchase with its own record, to prove they do not mix (BR-07).
    const other = await createPurchase(cookie);
    await add({ ...VALID, description: 'Other product' }, cookie, other.body.id).expect(201);

    const response = await listFor(purchaseId).expect(200);

    expect(response.body.map((r: { description: string }) => r.description)).toEqual([
      'Second visit',
      'First visit',
    ]);
  });

  it('API-SVC-03 a record without a description is rejected', async () => {
    const { description: _omitted, ...body } = VALID;
    const response = await add(body).expect(400);

    expect(response.body.error.fields).toHaveProperty('description');
  });

  it('API-SVC-04 a service before the purchase date is rejected', async () => {
    const response = await add({ ...VALID, serviceDate: '2026-10-19' }).expect(400);

    expect(response.body.error.fields).toHaveProperty('serviceDate');
  });

  it('API-SVC-05 a service in the future is rejected', async () => {
    const response = await add({ ...VALID, serviceDate: '2026-10-28' }).expect(400);

    expect(response.body.error.fields).toHaveProperty('serviceDate');
  });

  it('API-SVC-06 a negative cost is rejected', async () => {
    const response = await add({ ...VALID, cost: -5 }).expect(400);

    expect(response.body.error.fields).toHaveProperty('cost');
  });

  it('API-SVC-07 a record can be changed and the change persists', async () => {
    const created = await add().expect(201);

    const patched = await request(app.getHttpServer())
      .patch(`/api/v1/services/${created.body.id}`)
      .set('Cookie', cookie)
      .send({ cost: 1600, description: 'Replaced the fan and cleaned the element' })
      .expect(200);

    expect(patched.body.cost).toBe(1600);

    const reread = await listFor(purchaseId).expect(200);
    expect(reread.body[0]).toMatchObject({
      cost: 1600,
      description: 'Replaced the fan and cleaned the element',
      // Untouched fields survive the patch.
      provider: VALID.provider,
    });
  });

  it('API-SVC-08 a record can be deleted', async () => {
    const created = await add().expect(201);

    await request(app.getHttpServer())
      .delete(`/api/v1/services/${created.body.id}`)
      .set('Cookie', cookie)
      .expect(204);

    const remaining = await listFor(purchaseId).expect(200);
    expect(remaining.body).toEqual([]);
  });

  describe('BR-09 ownership', () => {
    let bCookie: string;
    let aRecordId: string;

    beforeEach(async () => {
      aRecordId = (await add()).body.id;
      ({ cookie: bCookie } = await signUp(app, { email: 'bob@test.dev', name: 'Bob' }));
    });

    it("API-SVC-09 B can neither list nor add on A's purchase", async () => {
      await listFor(purchaseId, bCookie).expect(404);
      await add(VALID, bCookie).expect(404);
    });

    it("API-SVC-10 B cannot change or delete A's record, and it survives", async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/services/${aRecordId}`)
        .set('Cookie', bCookie)
        .send({ description: 'Tampered' })
        .expect(404);

      await request(app.getHttpServer())
        .delete(`/api/v1/services/${aRecordId}`)
        .set('Cookie', bCookie)
        .expect(404);

      const stillThere = await listFor(purchaseId).expect(200);
      expect(stillThere.body).toHaveLength(1);
      expect(stillThere.body[0].description).toBe(VALID.description);
    });
  });
});
