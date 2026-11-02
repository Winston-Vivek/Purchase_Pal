import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { RecordingMailer } from '../src/common/mail/recording.mailer';
import { signUp } from './utils/auth';
import { createTestApp } from './utils/create-test-app';
import { truncateAll } from './utils/database';

/**
 * API-USR-01..07 from docs/test-cases.md §2.9 — BR-15.
 *
 * Email is the login identifier and the address a password reset goes to, so
 * the property that carries this file is: the new address is not written
 * until a link sent TO that address is opened.
 */
describe('Profile (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let mailer: RecordingMailer;

  const OLD_EMAIL = 'ada@test.dev';
  const NEW_EMAIL = 'ada.lovelace@test.dev';
  const PASSWORD = 'Passw0rd1';

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

  const me = (cookie: string) =>
    request(app.getHttpServer()).get('/api/v1/auth/me').set('Cookie', cookie);

  const rename = (cookie: string, name: string) =>
    request(app.getHttpServer()).patch('/api/v1/users/me').set('Cookie', cookie).send({ name });

  const askEmail = (cookie: string, email: string, currentPassword = PASSWORD) =>
    request(app.getHttpServer())
      .post('/api/v1/users/me/email')
      .set('Cookie', cookie)
      .send({ email, currentPassword });

  const confirm = (token: string) =>
    request(app.getHttpServer()).post('/api/v1/users/me/email/confirm').send({ token });

  const login = (email: string) =>
    request(app.getHttpServer()).post('/api/v1/auth/login').send({ email, password: PASSWORD });

  const tokenFromEmail = (to: string): string => {
    const sent = mailer.to(to).at(-1);
    const match = /confirm-email\?token=([A-Za-z0-9_-]+)/.exec(sent?.text ?? '');
    if (!match?.[1]) throw new Error(`no confirm link in: ${sent?.text ?? '(no email)'}`);
    return match[1];
  };

  it('API-USR-01 the name can be changed', async () => {
    const { cookie } = await signUp(app, { email: OLD_EMAIL, password: PASSWORD });

    const response = await rename(cookie, 'Ada King').expect(200);

    expect(response.body.name).toBe('Ada King');
    expect((await me(cookie).expect(200)).body.name).toBe('Ada King');
  });

  it('API-USR-02 the link goes to the new address and the old one is warned', async () => {
    const { cookie } = await signUp(app, { email: OLD_EMAIL, password: PASSWORD });
    mailer.clear();

    await askEmail(cookie, NEW_EMAIL).expect(202);

    // The proof of control has to be sent where control is being claimed.
    expect(mailer.to(NEW_EMAIL)).toHaveLength(1);
    expect(mailer.to(NEW_EMAIL)[0]?.text).toContain('confirm-email?token=');

    // And the address losing the account is told, which is how a takeover
    // gets noticed.
    expect(mailer.to(OLD_EMAIL)).toHaveLength(1);
    expect(mailer.to(OLD_EMAIL)[0]?.text).toContain(NEW_EMAIL);
    expect(mailer.to(OLD_EMAIL)[0]?.text).not.toContain('confirm-email?token=');
  });

  it('API-USR-03 nothing changes until the link is opened', async () => {
    const { cookie } = await signUp(app, { email: OLD_EMAIL, password: PASSWORD });
    await askEmail(cookie, NEW_EMAIL).expect(202);

    expect((await me(cookie).expect(200)).body.email).toBe(OLD_EMAIL);
    await login(OLD_EMAIL).expect(200);
    await login(NEW_EMAIL).expect(401);
  });

  it('API-USR-04 opening the link moves the account to the new address', async () => {
    const { cookie } = await signUp(app, { email: OLD_EMAIL, password: PASSWORD });
    mailer.clear();
    await askEmail(cookie, NEW_EMAIL).expect(202);

    await confirm(tokenFromEmail(NEW_EMAIL)).expect(200);

    expect((await me(cookie).expect(200)).body.email).toBe(NEW_EMAIL);
    await login(NEW_EMAIL).expect(200);
    await login(OLD_EMAIL).expect(401);
  });

  it('API-USR-05 an address already in use is refused, and nothing is sent', async () => {
    const { cookie } = await signUp(app, { email: OLD_EMAIL, password: PASSWORD });
    await signUp(app, { email: NEW_EMAIL, password: PASSWORD });
    mailer.clear();

    await askEmail(cookie, NEW_EMAIL).expect(409);

    expect(mailer.sent).toHaveLength(0);
  });

  it('API-USR-06 the wrong current password changes nothing and sends nothing', async () => {
    const { cookie } = await signUp(app, { email: OLD_EMAIL, password: PASSWORD });
    mailer.clear();

    const response = await askEmail(cookie, NEW_EMAIL, 'NotMyPassw0rd').expect(400);

    expect(response.body.error.fields).toHaveProperty('currentPassword');
    expect(mailer.sent).toHaveLength(0);
  });

  it('API-USR-07 a token works once, and a bad one is refused the same way', async () => {
    const { cookie } = await signUp(app, { email: OLD_EMAIL, password: PASSWORD });
    mailer.clear();
    await askEmail(cookie, NEW_EMAIL).expect(202);
    const token = tokenFromEmail(NEW_EMAIL);

    await confirm(token).expect(200);
    const spent = await confirm(token).expect(400);
    const invented = await confirm('never-issued').expect(400);

    expect(spent.body).toEqual(invented.body);
  });

  it('API-USR-02 a signed-out caller cannot ask for a change', async () => {
    await signUp(app, { email: OLD_EMAIL, password: PASSWORD });
    mailer.clear();

    await request(app.getHttpServer())
      .post('/api/v1/users/me/email')
      .send({ email: NEW_EMAIL, currentPassword: PASSWORD })
      .expect(401);

    expect(mailer.sent).toHaveLength(0);
  });
});
