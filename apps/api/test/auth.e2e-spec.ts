import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { User } from '../src/users/user.entity';
import { createTestApp } from './utils/create-test-app';
import { truncateAll } from './utils/database';

/**
 * API-AUTH-01..12 from docs/test-cases.md §2.2 — US-01.
 *
 * The token rides in an httpOnly cookie (D-04), so these tests assert on
 * Set-Cookie rather than a response body token: a token the JavaScript on the
 * page can read is a token an XSS can steal.
 */

const VALID = { name: 'Ada Lovelace', email: 'ada@test.dev', password: 'Passw0rd1' };
const COOKIE = 'access_token';

function setCookies(response: request.Response): string[] {
  const raw = response.headers['set-cookie'];
  if (Array.isArray(raw)) return raw;
  return typeof raw === 'string' ? [raw] : [];
}

function authCookie(response: request.Response): string | undefined {
  return setCookies(response).find((cookie) => cookie.startsWith(`${COOKIE}=`));
}

describe('Auth (e2e)', () => {
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

  const register = (body: Record<string, unknown> = VALID) =>
    request(app.getHttpServer()).post('/api/v1/auth/register').send(body);

  const login = (body: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/api/v1/auth/login').send(body);

  it('API-AUTH-01 register returns the user with alert settings and sets an httpOnly cookie', async () => {
    const response = await register().expect(201);

    expect(response.body).toMatchObject({
      name: VALID.name,
      email: VALID.email,
      warrantyAlertDays: 30,
      returnAlertDays: 7,
    });
    expect(typeof response.body.id).toBe('string');

    const cookie = authCookie(response);
    expect(cookie).toBeDefined();
    expect(cookie).toMatch(/HttpOnly/i);
  });

  it('API-AUTH-02 the password never comes back, and what is stored is a bcrypt hash', async () => {
    const response = await register().expect(201);

    const body = JSON.stringify(response.body);
    expect(body).not.toContain('password');
    expect(body).not.toContain('passwordHash');
    expect(body).not.toContain(VALID.password);

    const stored = await dataSource.getRepository(User).findOneByOrFail({ email: VALID.email });
    expect(stored.passwordHash).not.toBe(VALID.password);
    // bcrypt hashes start $2a/$2b/$2y and encode the cost; >= 10 per §11.
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$(1[0-5])\$/);
  });

  it('API-AUTH-03 an email already in use is 409 CONFLICT, whatever its case', async () => {
    await register().expect(201);

    const response = await register({ ...VALID, email: 'ADA@TEST.DEV' }).expect(409);

    expect(response.body.error.code).toBe('CONFLICT');
    await expect(dataSource.getRepository(User).count()).resolves.toBe(1);
  });

  it('API-AUTH-04 a password under 8 characters is rejected', async () => {
    const response = await register({ ...VALID, password: 'short1' }).expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.fields).toHaveProperty('password');
  });

  it('API-AUTH-05 a password with no digit is rejected', async () => {
    const response = await register({ ...VALID, password: 'longpassword' }).expect(400);

    expect(response.body.error.fields).toHaveProperty('password');
  });

  it('API-AUTH-06 an invalid email is rejected', async () => {
    const response = await register({ ...VALID, email: 'not-an-email' }).expect(400);

    expect(response.body.error.fields).toHaveProperty('email');
  });

  it('API-AUTH-07 login with correct credentials sets an httpOnly SameSite=Lax cookie on /', async () => {
    await register().expect(201);

    const response = await login({ email: VALID.email, password: VALID.password }).expect(200);

    const cookie = authCookie(response);
    expect(cookie).toBeDefined();
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Path=\//i);
  });

  it('API-AUTH-08 a wrong password and an unknown email fail identically, with no cookie', async () => {
    await register().expect(201);

    const wrongPassword = await login({ email: VALID.email, password: 'Wrongpass1' }).expect(401);
    const unknownEmail = await login({ email: 'nobody@test.dev', password: VALID.password }).expect(
      401,
    );

    expect(wrongPassword.body.error.code).toBe('UNAUTHENTICATED');
    expect(unknownEmail.body.error.code).toBe('UNAUTHENTICATED');

    // Identical wording on purpose: a different message for "no such user"
    // turns this endpoint into a way to discover who has an account.
    expect(wrongPassword.body.error.message).toBe(unknownEmail.body.error.message);

    expect(authCookie(wrongPassword)).toBeUndefined();
    expect(authCookie(unknownEmail)).toBeUndefined();
  });

  it('API-AUTH-09 /auth/me returns the signed-in user', async () => {
    const registered = await register().expect(201);
    const cookie = authCookie(registered) as string;

    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', cookie)
      .expect(200);

    expect(response.body).toMatchObject({
      email: VALID.email,
      name: VALID.name,
      warrantyAlertDays: 30,
      returnAlertDays: 7,
    });
  });

  it('API-AUTH-10 /auth/me is 401 with no cookie and with a tampered token', async () => {
    const missing = await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    expect(missing.body.error.code).toBe('UNAUTHENTICATED');

    const registered = await register().expect(201);
    const cookie = authCookie(registered) as string;
    const tampered = cookie.replace(`${COOKIE}=`, `${COOKIE}=x`);

    await request(app.getHttpServer()).get('/api/v1/auth/me').set('Cookie', tampered).expect(401);
  });

  it('API-AUTH-11 logout clears the cookie and the session stops working', async () => {
    const registered = await register().expect(201);
    const cookie = authCookie(registered) as string;

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', cookie)
      .expect(204);

    const cleared = authCookie(response);
    expect(cleared).toBeDefined();
    // Cleared by expiring it, not by trusting the client to drop it.
    expect(cleared).toMatch(/access_token=;|Expires=Thu, 01 Jan 1970|Max-Age=0/i);

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', cleared as string)
      .expect(401);
  });

  it('API-AUTH-12 data endpoints are 401 without a cookie', async () => {
    await request(app.getHttpServer()).get('/api/v1/purchases').expect(401);
    await request(app.getHttpServer()).get('/api/v1/dashboard').expect(401);
  });
});
