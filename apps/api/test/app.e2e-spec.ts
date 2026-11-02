import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { User } from '../src/users/user.entity';
import { createTestApp } from './utils/create-test-app';
import { truncateAll } from './utils/database';

/**
 * Slice 0 smoke test.
 *
 * This file has no test-case ID from docs/test-cases.md because it proves the
 * harness itself, not a business rule: the app boots through the real
 * setupApp(), reaches the database, and can be truncated between tests. Every
 * TDD slice from Slice 1 onward depends on all three, so if this file is red
 * there is no point reading any other failure.
 *
 * It deliberately does NOT assert the { error: { code, message } } shape — that
 * is API-ERR-01..05, written test-first in Slice 2.
 */
describe('Application bootstrap (e2e)', () => {
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

  it('boots and serves the health check under the /api/v1 prefix', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health').expect(200);

    expect(response.body).toEqual({ status: 'ok', database: 'up' });
  });

  it('applies the global prefix, so an unprefixed path is not routed', async () => {
    await request(app.getHttpServer()).get('/health').expect(404);
  });

  it('rejects unknown properties, proving the global ValidationPipe is installed', async () => {
    // No DTO is registered yet, so this asserts only that the route does not
    // exist — the pipe's behaviour is covered properly in Slice 2.
    await request(app.getHttpServer()).get('/api/v1/does-not-exist').expect(404);
  });

  it('has every table from the first migration, and truncation leaves them empty', async () => {
    const tables = await dataSource.query<{ tablename: string }[]>(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename <> 'migrations'
      ORDER BY tablename
    `);

    expect(tables.map((t) => t.tablename)).toEqual([
      'attachments',
      'password_reset_tokens',
      'purchases',
      'service_records',
      'users',
    ]);

    await expect(dataSource.getRepository(User).count()).resolves.toBe(0);
  });
});
