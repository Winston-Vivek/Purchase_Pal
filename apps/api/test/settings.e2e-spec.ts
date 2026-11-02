import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from './utils/create-test-app';
import { signUp } from './utils/auth';
import { truncateAll } from './utils/database';

/**
 * API-SET-01..06 from docs/test-cases.md §2.3 — US-08.
 *
 * These windows are the `alertDays` BR-04 compares daysLeft against, so this
 * endpoint is what makes "expiring soon" mean something different per user.
 */
describe('Alert settings (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
  });

  beforeEach(async () => {
    await truncateAll(dataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  const patch = (cookie: string, body: Record<string, unknown>) =>
    request(app.getHttpServer())
      .patch('/api/v1/users/me/settings')
      .set('Cookie', cookie)
      .send(body);

  it('API-SET-01 a new user starts with 30 day warranty and 7 day return windows', async () => {
    const { cookie } = await signUp(app);

    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', cookie)
      .expect(200);

    expect(response.body).toMatchObject({ warrantyAlertDays: 30, returnAlertDays: 7 });
  });

  it('API-SET-02 the warranty window can be changed and persists', async () => {
    const { cookie } = await signUp(app);

    const updated = await patch(cookie, { warrantyAlertDays: 60 }).expect(200);
    expect(updated.body.warrantyAlertDays).toBe(60);

    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', cookie)
      .expect(200);

    expect(me.body.warrantyAlertDays).toBe(60);
    // Untouched fields stay as they were.
    expect(me.body.returnAlertDays).toBe(7);
  });

  it('API-SET-03 a warranty window outside 1-365 is rejected', async () => {
    const { cookie } = await signUp(app);

    for (const warrantyAlertDays of [0, 366]) {
      const response = await patch(cookie, { warrantyAlertDays }).expect(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.fields).toHaveProperty('warrantyAlertDays');
    }
  });

  it('API-SET-04 a return window outside 1-60 is rejected', async () => {
    const { cookie } = await signUp(app);

    for (const returnAlertDays of [0, 61]) {
      const response = await patch(cookie, { returnAlertDays }).expect(400);
      expect(response.body.error.fields).toHaveProperty('returnAlertDays');
    }
  });

  it('API-SET-05 this endpoint cannot be used to change anything else', async () => {
    const { cookie } = await signUp(app);

    // Changing your own email or alert-free status is not what this route is
    // for; whitelisting means these are refused, not quietly dropped.
    const email = await patch(cookie, { email: 'someone@else.dev' }).expect(400);
    expect(email.body.error.fields).toHaveProperty('email');

    await patch(cookie, { isAdmin: true }).expect(400);
  });

  it('API-SET-06 a narrower window changes a purchase status immediately', async () => {
    const { cookie } = await signUp(app);

    // Today is pinned to 2026-10-27, so a 5 day window closes on 2026-11-01.
    const created = await request(app.getHttpServer())
      .post('/api/v1/purchases')
      .set('Cookie', cookie)
      .send({
        productName: 'Nike Pegasus 41',
        category: 'FASHION',
        purchaseDate: '2026-10-27',
        price: 12995,
        returnWindowDays: 5,
      })
      .expect(201);

    // Default return window is 7 days, and 5 <= 7.
    expect(created.body.returnStatus).toBe('EXPIRING_SOON');

    await patch(cookie, { returnAlertDays: 3 }).expect(200);

    const after = await request(app.getHttpServer())
      .get(`/api/v1/purchases/${created.body.id}`)
      .set('Cookie', cookie)
      .expect(200);

    // Nothing about the purchase changed — only the window it is measured against.
    expect(after.body.returnStatus).toBe('ACTIVE');
    expect(after.body.returnDaysLeft).toBe(5);
  });

  // BR-12: a third deadline needs a third window, or every service would nag
  // on the same schedule as a return.
  it('API-SET-07 serviceAlertDays is accepted in range and refused outside it', async () => {
    const { cookie } = await signUp(app, { email: 'service-window@test.dev' });

    const ok = await patch(cookie, { serviceAlertDays: 21 }).expect(200);
    expect(ok.body.serviceAlertDays).toBe(21);

    await patch(cookie, { serviceAlertDays: 0 }).expect(400);
    await patch(cookie, { serviceAlertDays: 366 }).expect(400);
  });

  it('API-SET-07 a new account starts at 14 days', async () => {
    const { body } = await signUp(app, { email: 'service-default@test.dev' });

    expect(body.serviceAlertDays).toBe(14);
  });
});
