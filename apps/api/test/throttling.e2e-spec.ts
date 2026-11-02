import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { THROTTLER_OPTIONS } from '@nestjs/throttler/dist/throttler.constants';
import { DataSource } from 'typeorm';
import { signUp } from './utils/auth';
import { createTestApp } from './utils/create-test-app';
import { truncateAll } from './utils/database';

/**
 * API-THR-01..03 from docs/test-cases.md §2.11.
 *
 * /auth/forgot-password sends mail to an address an anonymous caller chooses,
 * which is an email-bombing tool if left open, and /auth/login is where a
 * password gets guessed. Both need a ceiling.
 *
 * The limits are read from configuration, so this file sets them low before
 * the app boots rather than making the suite send a hundred requests.
 */
describe('Rate limiting (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  /**
   * A fresh app per test, which is unusual here and deliberate.
   *
   * The counter lives in memory for the life of the app, and the storage
   * service keeps live hits in a private map that clearing the public one
   * does not touch — so tests would otherwise spend each other's budget.
   * Four boots is cheaper than reaching into another package's internals.
   */
  beforeEach(async () => {
    ({ app, dataSource } = await createTestApp((builder) =>
      builder
        .overrideProvider(THROTTLER_OPTIONS)
        .useValue([{ name: 'auth', ttl: 60_000, limit: 3 }]),
    ));
    await truncateAll(dataSource);
  });

  afterEach(async () => {
    await app.close();
  });

  const forgot = (email: string) =>
    request(app.getHttpServer()).post('/api/v1/auth/forgot-password').send({ email });

  const login = (password: string) =>
    request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'ada@test.dev', password });

  it('API-THR-01 a flood of reset requests is cut off', async () => {
    for (let i = 0; i < 3; i += 1) await forgot('ada@test.dev').expect(202);

    const refused = await forgot('ada@test.dev').expect(429);

    // The error shape is the app's, not the library's default (CLAUDE.md §7).
    expect(refused.body.error).toMatchObject({ code: expect.any(String) });
    expect(refused.body.error.message).toMatch(/too many/i);
  });

  it('API-THR-01 the limit is per endpoint, not per address', async () => {
    // Otherwise someone could reset the counter by varying the email, which
    // is exactly what an email-bombing script does.
    await forgot('one@test.dev').expect(202);
    await forgot('two@test.dev').expect(202);
    await forgot('three@test.dev').expect(202);

    await forgot('four@test.dev').expect(429);
  });

  it('API-THR-02 repeated failed logins are cut off', async () => {
    await signUp(app, { email: 'ada@test.dev', password: 'Passw0rd1' });

    for (let i = 0; i < 3; i += 1) await login('WrongPassw0rd').expect(401);

    await login('WrongPassw0rd').expect(429);
  });

  it('API-THR-03 an ordinary session is not punished for it', async () => {
    const { cookie } = await signUp(app, { email: 'bob@test.dev', password: 'Passw0rd1' });

    // Well past the auth limit, on a route that is not an auth endpoint.
    for (let i = 0; i < 8; i += 1) {
      await request(app.getHttpServer()).get('/api/v1/purchases').set('Cookie', cookie).expect(200);
    }
  });
});
