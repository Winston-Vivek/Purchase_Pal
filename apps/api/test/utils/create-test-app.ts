import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { setupApp } from '../../src/setup-app';

export interface TestContext {
  app: INestApplication;
  prisma: PrismaService;
  moduleRef: TestingModule;
}

/**
 * Boots the real AppModule through the real setupApp(), so an e2e test
 * exercises the same prefix, pipes, cookie parsing and CORS that main.ts
 * installs (test-e2e-supertest).
 *
 * Later slices override providers here — most importantly CLOCK, to pin "today"
 * to 2026-10-27 Asia/Kolkata (docs/test-plan.md §5).
 */
export async function createTestApp(): Promise<TestContext> {
  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  setupApp(app);
  await app.init();

  return { app, prisma: app.get(PrismaService), moduleRef };
}
