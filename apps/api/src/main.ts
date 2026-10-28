import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupApp } from './setup-app';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Same wiring the e2e suite uses. See setup-app.ts.
  setupApp(app);

  const config = app.get(ConfigService);
  const port = config.getOrThrow<number>('PORT');

  await app.listen(port);

  Logger.log(`Proofly API listening on http://localhost:${port}/api/v1`, 'Bootstrap');
}

// Top-level floating promise is the one place it is unavoidable; `void` makes
// that explicit for @typescript-eslint/no-floating-promises.
void bootstrap();
