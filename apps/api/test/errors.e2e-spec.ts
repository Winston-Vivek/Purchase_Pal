import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/create-test-app';

/**
 * API-ERR-01..05 from docs/test-cases.md §2.1.
 *
 * One shape for every failure (CLAUDE.md non-negotiable 7):
 *   { "error": { "code", "message", "fields"? } }
 *
 * The point is that a client never has to guess. A 400 from class-validator,
 * a 404 from the router and a 500 from an unhandled throw all arrive looking
 * the same, so the frontend has exactly one error path to write.
 */
describe('Error shape (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('API-ERR-01 a validation failure is 400 VALIDATION_ERROR naming every bad field', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({})
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(typeof response.body.error.message).toBe('string');
    expect(Object.keys(response.body.error.fields).sort()).toEqual(['email', 'name', 'password']);
  });

  it('API-ERR-02 an unknown route is 404 NOT_FOUND', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/unknown').expect(404);

    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(typeof response.body.error.message).toBe('string');
  });

  it('API-ERR-03 an unhandled error is 500 INTERNAL and leaks nothing', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/boom').expect(500);

    expect(response.body.error.code).toBe('INTERNAL');

    // The thrown message and its stack must not travel to the client: an
    // internal failure is exactly where secrets and file paths leak out.
    const body = JSON.stringify(response.body);
    expect(body).not.toContain('Kaboom');
    expect(body).not.toContain('secret-looking');
    expect(body).not.toMatch(/\bat .*\.ts:\d+/);
    expect(response.body.error.stack).toBeUndefined();
  });

  it('API-ERR-04 an unknown property is rejected by name, not ignored', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ name: 'Ada', email: 'ada@test.dev', password: 'Passw0rd!', isAdmin: true })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(Object.keys(response.body.error.fields)).toContain('isAdmin');
  });

  it('API-ERR-05 malformed JSON is 400 VALIDATION_ERROR, not a raw parser error', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .set('Content-Type', 'application/json')
      .send('{"name": "Ada",}')
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
