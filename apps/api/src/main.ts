import { INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { setupApp } from './setup-app';

/**
 * OpenAPI page at /api/docs, built from the DTOs rather than maintained by
 * hand, so it cannot drift from what the API actually accepts.
 *
 * Not mounted in production: this is a local-only MVP (D-07), and an always-on
 * schema dump is a map of the API for anyone who finds it.
 */
function mountDocs(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Proofly API')
    .setDescription('Purchases, receipts, return and warranty deadlines, service history.')
    .setVersion('1.0')
    .addCookieAuth('access_token')
    .build();

  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Same wiring the e2e suite uses. See setup-app.ts.
  setupApp(app);

  const config = app.get(ConfigService);
  if (config.getOrThrow<string>('NODE_ENV') !== 'production') mountDocs(app);

  const port = config.getOrThrow<number>('PORT');
  await app.listen(port);

  Logger.log(`Proofly API listening on http://localhost:${port}/api/v1`, 'Bootstrap');
  Logger.log(`API docs at http://localhost:${port}/api/docs`, 'Bootstrap');
}

// Top-level floating promise is the one place it is unavoidable; `void` makes
// that explicit for @typescript-eslint/no-floating-promises.
void bootstrap();
