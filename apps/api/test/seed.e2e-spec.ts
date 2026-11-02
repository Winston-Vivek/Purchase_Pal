import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { seed, DEMO_EMAIL, DEMO_PASSWORD, OTHER_EMAIL } from '../src/database/seed';
import { User } from '../src/users/user.entity';
import { createTestApp } from './utils/create-test-app';
import { truncateAll } from './utils/database';

/**
 * API-SEED-01..02 from docs/test-cases.md §6.
 *
 * The seed exists so a demo always opens on a dashboard with something to show.
 * Its dates are offsets from today rather than fixed days, so it keeps working
 * next week — which is exactly what these assertions check, since the e2e clock
 * is pinned to a different day from the one the seed will really run on.
 */
describe('Seed (e2e)', () => {
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

  const signIn = async (email: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: DEMO_PASSWORD })
      .expect(200);

    const raw = response.headers['set-cookie'];
    const cookies = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : [];
    return cookies.find((c) => c.startsWith('access_token=')) as string;
  };

  it('API-SEED-01 seeds two users and a dashboard with something on it', async () => {
    await seed(app);

    await expect(dataSource.getRepository(User).count()).resolves.toBe(2);

    const cookie = await signIn(DEMO_EMAIL);

    const purchases = await request(app.getHttpServer())
      .get('/api/v1/purchases')
      .set('Cookie', cookie)
      .expect(200);
    expect(purchases.body.total).toBe(7);

    const dashboard = await request(app.getHttpServer())
      .get('/api/v1/dashboard')
      .set('Cookie', cookie)
      .expect(200);

    // The point of the seed: a demo opens on work to do, not an empty state.
    expect(dashboard.body.counts).toMatchObject({
      total: 7,
      underWarranty: 5,
      openReturns: 2,
      // Three deadlines plus the seeded service due in four days (BR-12).
      needsAction: 4,
    });
    expect(dashboard.body.recentlyExpired).toHaveLength(2);

    // The demo has to show all three kinds, or the third one is invisible.
    const kinds = dashboard.body.needsAction.map((i: { kind: string }) => i.kind);
    expect(kinds).toContain('SERVICE');

    // Needs action is still ordered soonest-first after the offsets are applied.
    const daysLeft = dashboard.body.needsAction.map((i: { daysLeft: number }) => i.daysLeft);
    expect([...daysLeft].sort((a: number, b: number) => a - b)).toEqual(daysLeft);

    // The second account exists and owns nothing of the demo user's, so the
    // privacy step of the demo has two real accounts to use.
    const otherCookie = await signIn(OTHER_EMAIL);
    const otherPurchases = await request(app.getHttpServer())
      .get('/api/v1/purchases')
      .set('Cookie', otherCookie)
      .expect(200);
    expect(otherPurchases.body.total).toBe(1);
    expect(JSON.stringify(otherPurchases.body)).not.toContain('AirPods');
  });

  it('API-SEED-02 running it twice changes nothing', async () => {
    await seed(app);
    const second = await seed(app);

    expect(second.created).toBe(false);
    await expect(dataSource.getRepository(User).count()).resolves.toBe(2);

    const cookie = await signIn(DEMO_EMAIL);
    const purchases = await request(app.getHttpServer())
      .get('/api/v1/purchases')
      .set('Cookie', cookie)
      .expect(200);

    expect(purchases.body.total).toBe(7);
  });
});
