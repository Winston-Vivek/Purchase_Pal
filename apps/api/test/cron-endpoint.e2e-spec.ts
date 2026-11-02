import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { RecordingMailer } from '../src/common/mail/recording.mailer';
import { signUp } from './utils/auth';
import { createTestApp } from './utils/create-test-app';
import { truncateAll } from './utils/database';

/**
 * API-CRON-01..04 from docs/test-cases.md §2.12.
 *
 * A scale-to-zero host cannot run an in-process cron, so the schedule moves
 * outside and calls this. That makes it an endpoint an anonymous caller can
 * reach which sends email to everyone — so the only interesting tests are the
 * refusals.
 */
describe('Reminder cron endpoint (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let mailer: RecordingMailer;

  /** From .env.test: ConfigModule reads the environment when app.module.ts is
   *  imported, which is before anything in this file can run. */
  const SECRET = process.env.CRON_SECRET ?? '';

  beforeAll(async () => {
    expect(SECRET).not.toBe('');
    ({ app, dataSource, mailer } = await createTestApp());
  });

  beforeEach(async () => {
    await truncateAll(dataSource);
    mailer.clear();
  });

  afterAll(async () => {
    await app.close();
  });

  const run = (secret?: string) => {
    const call = request(app.getHttpServer()).post('/api/v1/internal/reminders/run');
    return secret === undefined ? call : call.set('x-cron-secret', secret);
  };

  /** A return closing in 3 days, inside the default 7-day window. */
  const closingSoon = async (): Promise<void> => {
    const { cookie } = await signUp(app, { email: 'ada@test.dev' });
    await request(app.getHttpServer())
      .post('/api/v1/purchases')
      .set('Cookie', cookie)
      .send({
        productName: 'AirPods Pro',
        category: 'ELECTRONICS',
        purchaseDate: '2026-10-27',
        price: 24900,
        returnDeadline: '2026-10-30',
      })
      .expect(201);
    mailer.clear();
  };

  it('API-CRON-01 the right secret runs the digest', async () => {
    await closingSoon();

    const response = await run(SECRET).expect(200);

    expect(response.body).toEqual({ users: 1, reminders: 1 });
    expect(mailer.to('ada@test.dev')).toHaveLength(1);
  });

  it('API-CRON-02 no secret sends nothing', async () => {
    await closingSoon();

    await run().expect(401);

    expect(mailer.sent).toHaveLength(0);
  });

  it('API-CRON-02 the wrong secret sends nothing', async () => {
    await closingSoon();

    await run('not-the-secret').expect(401);

    expect(mailer.sent).toHaveLength(0);
  });

  it('API-CRON-02 a secret of the right length but wrong content is refused', async () => {
    await closingSoon();

    // Same length, so a comparison that only checked length would pass it.
    await run(SECRET.toUpperCase()).expect(401);

    expect(mailer.sent).toHaveLength(0);
  });

  it('API-CRON-04 calling it twice sends once', async () => {
    await closingSoon();

    await run(SECRET).expect(200);
    const second = await run(SECRET).expect(200);

    expect(second.body).toEqual({ users: 0, reminders: 0 });
    expect(mailer.to('ada@test.dev')).toHaveLength(1);
  });
});
