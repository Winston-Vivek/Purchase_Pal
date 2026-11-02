import { INestApplication } from '@nestjs/common';
import { Test, TestingModule, TestingModuleBuilder } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { CLOCK } from '../../src/common/dates/clock';
import { MAILER } from '../../src/common/mail/mail.interface';
import { RecordingMailer } from '../../src/common/mail/recording.mailer';
import { setupApp } from '../../src/setup-app';
import { BoomModule } from './boom.module';

/** 11:30 IST on 2026-10-27. */
export const FIXED_NOW = '2026-10-27T06:00:00Z';

export interface TestContext {
  app: INestApplication;
  dataSource: DataSource;
  moduleRef: TestingModule;
  /** What the app tried to send, in order. */
  mailer: RecordingMailer;
}

/**
 * Boots the real AppModule through the real setupApp(), so an e2e test
 * exercises the same prefix, pipes, cookie parsing and CORS as main.ts
 * (test-e2e-supertest).
 *
 * Later slices override CLOCK here to pin today to 2026-10-27.
 */
/**
 * `configure` lets one suite change what the app is built with.
 *
 * It exists because ConfigModule.forRoot() runs when app.module.ts is
 * imported, not when the module is compiled — so a spec cannot change the
 * environment in beforeAll and expect it to be read. Overriding the provider
 * is the only honest way to vary configuration per suite.
 */
export async function createTestApp(
  configure: (builder: TestingModuleBuilder) => TestingModuleBuilder = (b) => b,
): Promise<TestContext> {
  const moduleRef: TestingModule = await configure(
    Test.createTestingModule({
      imports: [AppModule, BoomModule],
    }),
  )
    // Pins today to 2026-10-27 in Asia/Kolkata (docs/test-plan.md §5). Without
    // this, every expected deadline in the test cases would rot by tomorrow.
    .overrideProvider(CLOCK)
    .useValue({ now: () => new Date(FIXED_NOW) })
    // No suite opens an SMTP socket. The recorder keeps what was sent, so a
    // test asserts on a real subject and body instead of on a mock call.
    .overrideProvider(MAILER)
    .useValue(new RecordingMailer())
    .compile();

  const app = moduleRef.createNestApplication();
  setupApp(app);
  await app.init();

  return { app, dataSource: app.get(DataSource), moduleRef, mailer: app.get(MAILER) };
}
