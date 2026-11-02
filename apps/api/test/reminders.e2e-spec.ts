import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { RecordingMailer } from '../src/common/mail/recording.mailer';
import { RemindersService } from '../src/reminders/reminders.service';
import { signUp } from './utils/auth';
import { createTestApp } from './utils/create-test-app';
import { truncateAll } from './utils/database';

/**
 * API-REM-01..08 from docs/test-cases.md §2.10 — BR-16.
 *
 * The property that carries this file: a reminder is sent once. A job that
 * emails the same deadline every morning until it expires is how a useful
 * product becomes spam, and the uniqueness constraint — not the code around
 * it — is what makes a second send impossible.
 *
 * Today is 2026-10-27 in this suite.
 */
describe('Deadline reminders (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let mailer: RecordingMailer;
  let reminders: RemindersService;

  const EMAIL = 'ada@test.dev';

  beforeAll(async () => {
    ({ app, dataSource, mailer } = await createTestApp());
    reminders = app.get(RemindersService);
  });

  beforeEach(async () => {
    await truncateAll(dataSource);
    mailer.clear();
  });

  afterAll(async () => {
    await app.close();
  });

  const purchase = (cookie: string, body: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/api/v1/purchases').set('Cookie', cookie).send(body);

  /** A return closing in 3 days, which is inside the 7-day default. */
  const closingSoon = (cookie: string, productName = 'AirPods Pro') =>
    purchase(cookie, {
      productName,
      category: 'ELECTRONICS',
      purchaseDate: '2026-10-27',
      price: 24900,
      returnDeadline: '2026-10-30',
    });

  it('API-REM-01 a deadline inside the window is emailed', async () => {
    const { cookie } = await signUp(app, { email: EMAIL });
    await closingSoon(cookie).expect(201);
    mailer.clear();

    await reminders.sendDue();

    const sent = mailer.to(EMAIL);
    expect(sent).toHaveLength(1);
    expect(sent[0]?.subject).toMatch(/deadline/i);
    expect(sent[0]?.text).toContain('AirPods Pro');
  });

  it('API-REM-02 running the job twice sends once', async () => {
    const { cookie } = await signUp(app, { email: EMAIL });
    await closingSoon(cookie).expect(201);
    mailer.clear();

    await reminders.sendDue();
    await reminders.sendDue();

    expect(mailer.to(EMAIL)).toHaveLength(1);
  });

  it('API-REM-03 several deadlines are one email, not one each', async () => {
    const { cookie } = await signUp(app, { email: EMAIL });
    await closingSoon(cookie, 'AirPods Pro').expect(201);
    await closingSoon(cookie, 'Nike Pegasus').expect(201);
    mailer.clear();

    await reminders.sendDue();

    const sent = mailer.to(EMAIL);
    expect(sent).toHaveLength(1);
    expect(sent[0]?.text).toContain('AirPods Pro');
    expect(sent[0]?.text).toContain('Nike Pegasus');
  });

  it('API-REM-04 a deadline outside the window is left alone', async () => {
    const { cookie } = await signUp(app, { email: EMAIL });
    // 90 days out, against a 7-day return window.
    await purchase(cookie, {
      productName: 'Far away',
      category: 'ELECTRONICS',
      purchaseDate: '2026-10-27',
      price: 100,
      returnDeadline: '2027-01-25',
    }).expect(201);
    mailer.clear();

    await reminders.sendDue();

    expect(mailer.sent).toHaveLength(0);
  });

  it('API-REM-05 a user who turned reminders off gets nothing', async () => {
    const { cookie } = await signUp(app, { email: EMAIL });
    await closingSoon(cookie).expect(201);
    await request(app.getHttpServer())
      .patch('/api/v1/users/me/settings')
      .set('Cookie', cookie)
      .send({ emailReminders: false })
      .expect(200);
    mailer.clear();

    await reminders.sendDue();

    expect(mailer.sent).toHaveLength(0);
    // Nothing recorded either, so turning them back on still reminds.
    const rows: unknown[] = await dataSource.query('SELECT 1 FROM sent_reminders');
    expect(rows).toHaveLength(0);
  });

  it("API-REM-06 one user's deadlines never reach another's inbox", async () => {
    const { cookie: a } = await signUp(app, { email: EMAIL });
    const { cookie: b } = await signUp(app, { email: 'bob@test.dev' });
    await closingSoon(a, 'Ada laptop').expect(201);
    await closingSoon(b, 'Bob kettle').expect(201);
    mailer.clear();

    await reminders.sendDue();

    expect(mailer.to(EMAIL)[0]?.text).toContain('Ada laptop');
    expect(mailer.to(EMAIL)[0]?.text).not.toContain('Bob kettle');
    expect(mailer.to('bob@test.dev')[0]?.text).toContain('Bob kettle');
    expect(mailer.to('bob@test.dev')[0]?.text).not.toContain('Ada laptop');
  });

  it('API-REM-07 moving the deadline makes it a new reminder', async () => {
    const { cookie } = await signUp(app, { email: EMAIL });
    const created = await closingSoon(cookie).expect(201);
    mailer.clear();

    await reminders.sendDue();
    expect(mailer.to(EMAIL)).toHaveLength(1);

    await request(app.getHttpServer())
      .patch(`/api/v1/purchases/${created.body.id}`)
      .set('Cookie', cookie)
      .send({ returnDeadline: '2026-10-31' })
      .expect(200);

    await reminders.sendDue();

    // A different date is a different deadline, and the user moved it.
    expect(mailer.to(EMAIL)).toHaveLength(2);
  });

  it('API-REM-08 a user with nothing due gets no email at all', async () => {
    await signUp(app, { email: EMAIL });
    mailer.clear();

    await reminders.sendDue();

    expect(mailer.sent).toHaveLength(0);
  });
});
