import { INestApplication } from '@nestjs/common';
import { createHash } from 'node:crypto';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { RecordingMailer } from '../src/common/mail/recording.mailer';
import { signUp } from './utils/auth';
import { createTestApp } from './utils/create-test-app';
import { truncateAll } from './utils/database';

/**
 * API-AUTH-13..22 from docs/test-cases.md §2.2 — BR-13, BR-14.
 *
 * Most of these are refusals. A reset endpoint is the most attacked thing in a
 * small application, and the four properties that carry it are: it cannot be
 * used to find out which addresses have accounts, the raw token is never
 * stored, a token works once, and using one ends every existing session.
 */
describe('Password reset (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let mailer: RecordingMailer;

  const EMAIL = 'ada@test.dev';
  const OLD_PASSWORD = 'Passw0rd1';
  const NEW_PASSWORD = 'N3wPassw0rd';

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

  const forgot = (email: string) =>
    request(app.getHttpServer()).post('/api/v1/auth/forgot-password').send({ email });

  const reset = (token: string, password: string) =>
    request(app.getHttpServer()).post('/api/v1/auth/reset-password').send({ token, password });

  const login = (password: string, email = EMAIL) =>
    request(app.getHttpServer()).post('/api/v1/auth/login').send({ email, password });

  /** Pulls the token out of the email the way a person would: from the link. */
  const tokenFromEmail = (): string => {
    const sent = mailer.to(EMAIL).at(-1);
    const match = /reset-password\?token=([A-Za-z0-9_-]+)/.exec(sent?.text ?? '');
    if (!match?.[1]) throw new Error(`no reset link in: ${sent?.text ?? '(no email)'}`);
    return match[1];
  };

  describe('asking for a link', () => {
    it('API-AUTH-13 a real account is emailed a link', async () => {
      await signUp(app, { email: EMAIL, password: OLD_PASSWORD });
      mailer.clear();

      const response = await forgot(EMAIL).expect(202);

      expect(response.body).toEqual({});
      expect(mailer.to(EMAIL)).toHaveLength(1);
      expect(mailer.to(EMAIL)[0]?.subject).toBe('Reset your password');
      expect(mailer.to(EMAIL)[0]?.text).toContain('http://localhost:5173/reset-password?token=');
    });

    it('API-AUTH-14 an unknown address gets the same answer and no email', async () => {
      await signUp(app, { email: EMAIL, password: OLD_PASSWORD });
      mailer.clear();

      const known = await forgot(EMAIL).expect(202);
      mailer.clear();
      const unknown = await forgot('nobody@test.dev').expect(202);

      // Identical responses: this endpoint must not be an oracle for which
      // addresses have accounts.
      expect(unknown.status).toBe(known.status);
      expect(unknown.body).toEqual(known.body);
      expect(mailer.sent).toHaveLength(0);
    });

    it('API-AUTH-15 the database holds a digest, never the token', async () => {
      await signUp(app, { email: EMAIL, password: OLD_PASSWORD });
      mailer.clear();
      await forgot(EMAIL).expect(202);

      const token = tokenFromEmail();
      const rows: { token_hash: string }[] = await dataSource.query(
        'SELECT token_hash FROM password_reset_tokens',
      );

      expect(rows).toHaveLength(1);
      expect(rows[0]?.token_hash).toBe(createHash('sha256').update(token).digest('hex'));
      // The point: a dump of this table cannot be used to reset anything.
      expect(rows[0]?.token_hash).not.toBe(token);
    });

    it('API-AUTH-20 asking again retires the first link', async () => {
      await signUp(app, { email: EMAIL, password: OLD_PASSWORD });
      mailer.clear();

      await forgot(EMAIL).expect(202);
      const first = tokenFromEmail();
      await forgot(EMAIL).expect(202);
      const second = tokenFromEmail();

      expect(second).not.toBe(first);
      await reset(first, NEW_PASSWORD).expect(400);
      await reset(second, NEW_PASSWORD).expect(200);
    });
  });

  describe('using the link', () => {
    const requestReset = async (): Promise<string> => {
      await signUp(app, { email: EMAIL, password: OLD_PASSWORD });
      mailer.clear();
      await forgot(EMAIL).expect(202);
      return tokenFromEmail();
    };

    it('API-AUTH-16 the new password works and the old one does not', async () => {
      const token = await requestReset();

      await reset(token, NEW_PASSWORD).expect(200);

      await login(NEW_PASSWORD).expect(200);
      await login(OLD_PASSWORD).expect(401);
    });

    it('API-AUTH-17 a token works once', async () => {
      const token = await requestReset();
      await reset(token, NEW_PASSWORD).expect(200);

      await reset(token, 'An0therPassword').expect(400);

      // The second attempt changed nothing.
      await login(NEW_PASSWORD).expect(200);
      await login('An0therPassword').expect(401);
    });

    it('API-AUTH-18 an expired token is refused', async () => {
      const token = await requestReset();

      // Aged in the database rather than by waiting: the expiry is a stored
      // timestamp, so moving it is the honest way to test the boundary.
      await dataSource.query(
        "UPDATE password_reset_tokens SET expires_at = NOW() - INTERVAL '1 minute'",
      );

      await reset(token, NEW_PASSWORD).expect(400);
      await login(OLD_PASSWORD).expect(200);
    });

    it('API-AUTH-19 an expired token and an invented one are indistinguishable', async () => {
      const token = await requestReset();
      await dataSource.query(
        "UPDATE password_reset_tokens SET expires_at = NOW() - INTERVAL '1 minute'",
      );

      const expired = await reset(token, NEW_PASSWORD).expect(400);
      const invented = await reset('never-issued-token', NEW_PASSWORD).expect(400);

      // Telling them apart would say "this token was real", which is a hint.
      expect(expired.body).toEqual(invented.body);
    });

    it('API-AUTH-19 a token nobody issued is refused', async () => {
      await requestReset();

      await reset('not-a-real-token-at-all', NEW_PASSWORD).expect(400);
      await login(OLD_PASSWORD).expect(200);
    });

    it('API-AUTH-19 a tampered token is refused', async () => {
      const token = await requestReset();

      await reset(`${token}x`, NEW_PASSWORD).expect(400);
      await login(OLD_PASSWORD).expect(200);
    });

    it('API-AUTH-22 a weak password is refused and the link still works', async () => {
      const token = await requestReset();

      const bad = await reset(token, 'short').expect(400);
      expect(bad.body.error.fields).toHaveProperty('password');

      // Refusing the password must not burn the token: the user is mid-task.
      await reset(token, NEW_PASSWORD).expect(200);
      await login(NEW_PASSWORD).expect(200);
    });

    it('API-AUTH-21 every session open before the reset is ended', async () => {
      const { cookie } = await signUp(app, { email: EMAIL, password: OLD_PASSWORD });
      mailer.clear();

      // The session works before the reset.
      await request(app.getHttpServer()).get('/api/v1/auth/me').set('Cookie', cookie).expect(200);

      await forgot(EMAIL).expect(202);
      await reset(tokenFromEmail(), NEW_PASSWORD).expect(200);

      // A reset that leaves the attacker signed in has not removed them.
      await request(app.getHttpServer()).get('/api/v1/auth/me').set('Cookie', cookie).expect(401);

      const fresh = await login(NEW_PASSWORD).expect(200);
      const raw = fresh.headers['set-cookie'];
      const cookies = Array.isArray(raw) ? raw : [raw as string];
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', cookies.find((c) => c.startsWith('access_token=')) ?? '')
        .expect(200);
    });

    it('API-AUTH-16 the response never carries the token or the password', async () => {
      const token = await requestReset();

      const response = await reset(token, NEW_PASSWORD).expect(200);

      expect(JSON.stringify(response.body)).not.toContain(token);
      expect(JSON.stringify(response.body)).not.toContain(NEW_PASSWORD);
    });
  });
});
