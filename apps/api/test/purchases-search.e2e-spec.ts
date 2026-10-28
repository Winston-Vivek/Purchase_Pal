import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { signUp } from './utils/auth';
import { createTestApp } from './utils/create-test-app';
import { seedDashboard } from './utils/dashboard-fixture';
import { truncateAll } from './utils/database';

/**
 * API-SRCH-01..10 from docs/test-cases.md §2.8 — US-10.
 * Same seven purchases as the dashboard, today pinned to 2026-10-27.
 */
describe('Search, filter and sort (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let cookie: string;

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
  });

  beforeEach(async () => {
    await truncateAll(dataSource);
    ({ cookie } = await signUp(app));
    await seedDashboard(app, cookie);
  });

  afterAll(async () => {
    await app.close();
  });

  const search = (query: string, as: string = cookie) =>
    request(app.getHttpServer()).get(`/api/v1/purchases${query}`).set('Cookie', as);

  const names = (body: { items: { productName: string }[] }) =>
    body.items.map((p) => p.productName);

  it('API-SRCH-01 text search matches the product name, ignoring case', async () => {
    const response = await search('?q=airpods').expect(200);

    expect(names(response.body)).toEqual(['AirPods Pro (2nd generation)']);
    expect(response.body.total).toBe(1);
  });

  it('API-SRCH-02 text search matches the seller', async () => {
    const response = await search('?q=croma').expect(200);

    expect(names(response.body)).toEqual(['Samsung 1.5 Ton Inverter Split AC']);
  });

  it('API-SRCH-03 text search matches the notes', async () => {
    const response = await search('?q=kitchen%20drawer').expect(200);

    expect(names(response.body)).toEqual(['Philips Air Fryer']);
  });

  it('API-SRCH-04 category filter', async () => {
    const response = await search('?category=APPLIANCES').expect(200);

    expect(names(response.body).sort()).toEqual([
      'LG washing machine',
      'Samsung 1.5 Ton Inverter Split AC',
    ]);
  });

  it('API-SRCH-05 return status filter uses the computed status', async () => {
    const response = await search('?returnStatus=EXPIRING_SOON').expect(200);

    expect(names(response.body).sort()).toEqual([
      'AirPods Pro (2nd generation)',
      'Nike Pegasus 41',
    ]);
  });

  it('API-SRCH-06 warranty status filter finds the expired one', async () => {
    const response = await search('?warrantyStatus=EXPIRED').expect(200);

    expect(names(response.body)).toEqual(['LG washing machine']);
  });

  it('API-SRCH-07 sorting by price, most expensive first', async () => {
    const response = await search('?sort=price_desc').expect(200);

    expect(names(response.body)[0]).toBe('Dell XPS 13');
    expect(response.body.items[0].price).toBe(124990);
  });

  it('API-SRCH-08 sorting by nearest deadline', async () => {
    const response = await search('?sort=deadline_asc').expect(200);

    // Nike 31 Oct, Samsung 1 Nov, AirPods 3 Nov — across both kinds of
    // deadline, because the user cares which comes next, not which sort of
    // deadline it is.
    expect(names(response.body).slice(0, 3)).toEqual([
      'Nike Pegasus 41',
      'Samsung 1.5 Ton Inverter Split AC',
      'AirPods Pro (2nd generation)',
    ]);
    // Nothing upcoming at all sorts last, not first.
    expect(names(response.body)[6]).toBe('LG washing machine');
  });

  it('API-SRCH-09 the second page holds what the first did not', async () => {
    const response = await search('?page=2&pageSize=5').expect(200);

    expect(response.body).toMatchObject({ total: 7, page: 2, pageSize: 5 });
    expect(names(response.body)).toEqual(['Dell XPS 13', 'LG washing machine']);
  });

  it("API-SRCH-10 B's search never reaches A's purchases", async () => {
    const { cookie: bCookie } = await signUp(app, { email: 'bob@test.dev', name: 'Bob' });

    const response = await search('?q=airpods', bCookie).expect(200);

    expect(response.body.items).toEqual([]);
    expect(response.body.total).toBe(0);
  });
});
