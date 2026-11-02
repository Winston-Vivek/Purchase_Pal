import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { RecordingMailer } from '../src/common/mail/recording.mailer';
import { signUp } from './utils/auth';
import { createTestApp } from './utils/create-test-app';
import { truncateAll } from './utils/database';

/**
 * API-AUTH-23..28 from docs/test-cases.md §2.2 — BR-13.
 *
 * The property that carries this endpoint: a stolen session must not be able
 * to lock the real owner out, which is why the current password is required
 * even though the caller is already signed in.
 */
describe('Change password (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let mailer: RecordingMailer;

  const EMAIL = 'ada@test.dev';
  const OLD = 'Passw0rd1';
  const NEW = 'N3wPassw0rd';

  beforeAll(async () => {
    ({ app, dataSource, mailer } = await createTestApp());
  });

  beforeEach(async () => {
    await truncateAll(dataSource);
    mailer.clear();
  });

  afterAll(async () => {
    await app.close();
  });

  const change = (cookie: string, body: Record<string, unknown>) =>
    request(app.getHttpServer()).patch('/api/v1/auth/password').set('Cookie', cookie).send(body);

  const login = (password: string) =>
    request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: EMAIL, password });

  const me = (cookie: string) =>
    request(app.getHttpServer()).get('/api/v1/auth/me').set('Cookie', cookie);

  const cookieFrom = (response: request.Response): string => {
    const raw: unknown = response.headers['set-cookie'];
    const all: string[] = Array.isArray(raw) ? (raw as string[]) : [String(raw)];
    const found = all.find((c) => c.startsWith('access_token='));
    if (!found) throw new Error('no auth cookie in response');
    return found;
  };

  it('API-AUTH-23 the new password works and the old one does not', async () => {
    const { cookie } = await signUp(app, { email: EMAIL, password: OLD });

    await change(cookie, { currentPassword: OLD, newPassword: NEW }).expect(200);

    await login(NEW).expect(200);
    await login(OLD).expect(401);
  });

  it('API-AUTH-24 the wrong current password is a 400 on that field', async () => {
    const { cookie } = await signUp(app, { email: EMAIL, password: OLD });

    const response = await change(cookie, {
      currentPassword: 'NotMyPassw0rd',
      newPassword: NEW,
    }).expect(400);

    // Not 401: that would look like the session expired and send a signed-in
    // person back to the sign-in page for a typo.
    expect(response.body.error.fields).toHaveProperty('currentPassword');
    await login(OLD).expect(200);
  });

  it('API-AUTH-25 a weak new password changes nothing', async () => {
    const { cookie } = await signUp(app, { email: EMAIL, password: OLD });

    const response = await change(cookie, { currentPassword: OLD, newPassword: 'short' }).expect(
      400,
    );

    expect(response.body.error.fields).toHaveProperty('newPassword');
    await login(OLD).expect(200);
  });

  it('API-AUTH-26 the device that made the change keeps working', async () => {
    const { cookie } = await signUp(app, { email: EMAIL, password: OLD });

    const response = await change(cookie, { currentPassword: OLD, newPassword: NEW }).expect(200);

    // BR-13 ends every session under the old password — including this one,
    // so the response has to hand this device a new cookie or the user is
    // signed out by their own action.
    await me(cookieFrom(response)).expect(200);
  });

  it('API-AUTH-27 every other device is signed out', async () => {
    const { cookie: deviceA } = await signUp(app, { email: EMAIL, password: OLD });
    const deviceB = cookieFrom(await login(OLD).expect(200));
    await me(deviceB).expect(200);

    await change(deviceA, { currentPassword: OLD, newPassword: NEW }).expect(200);

    await me(deviceB).expect(401);
  });

  it('API-AUTH-28 a signed-out caller changes nothing', async () => {
    await signUp(app, { email: EMAIL, password: OLD });

    await request(app.getHttpServer())
      .patch('/api/v1/auth/password')
      .send({ currentPassword: OLD, newPassword: NEW })
      .expect(401);

    await login(OLD).expect(200);
  });

  it('API-AUTH-23 the owner is told their password changed', async () => {
    const { cookie } = await signUp(app, { email: EMAIL, password: OLD });
    mailer.clear();

    await change(cookie, { currentPassword: OLD, newPassword: NEW }).expect(200);

    const sent = mailer.to(EMAIL);
    expect(sent).toHaveLength(1);
    expect(sent[0]?.subject).toBe('Your password was changed');
    // This is how someone learns their account was taken; it must never
    // carry the password itself.
    expect(sent[0]?.text).not.toContain(NEW);
  });
});
