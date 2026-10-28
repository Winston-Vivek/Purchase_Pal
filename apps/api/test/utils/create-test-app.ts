import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { setupApp } from '../../src/setup-app';

export interface TestContext {
  app: INestApplication;
  dataSource: DataSource;
  moduleRef: TestingModule;
}

/**
 * Boots the real AppModule through the real setupApp(), so an e2e test
 * exercises the same prefix, pipes, cookie parsing and CORS as main.ts
 * (test-e2e-supertest).
 *
 * Later slices override CLOCK here to pin today to 2026-10-27.
 */
export async function createTestApp(): Promise<TestContext> {
  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  setupApp(app);
  await app.init();

  return { app, dataSource: app.get(DataSource), moduleRef };
}
