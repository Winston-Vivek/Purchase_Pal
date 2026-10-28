import { INestApplication } from '@nestjs/common';
import request from 'supertest';

/** Registers a user and returns the auth cookie, which is how every protected
 *  request in the e2e suite is made. */
export async function signUp(
  app: INestApplication,
  overrides: Partial<{ name: string; email: string; password: string }> = {},
): Promise<{ cookie: string; body: Record<string, any> }> {
  const credentials = {
    name: 'Ada Lovelace',
    email: 'ada@test.dev',
    password: 'Passw0rd1',
    ...overrides,
  };

  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send(credentials)
    .expect(201);

  const raw = response.headers['set-cookie'];
  const cookies = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : [];
  const cookie = cookies.find((c) => c.startsWith('access_token='));

  if (!cookie) throw new Error('register did not set an auth cookie');

  return { cookie, body: response.body };
}
