import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';

/**
 * Every piece of global wiring the app needs, in one function.
 *
 * `main.ts` and the e2e tests both call this, and that is the whole point
 * (test-e2e-supertest). If the test app were assembled separately it would
 * drift from the real one, and the suite would start proving things about an
 * application that nobody ships — the prefix, the validation rules or the
 * cookie parsing could all differ without a single test turning red.
 */
export function setupApp(app: INestApplication): INestApplication {
  const config = app.get(ConfigService);

  // requirements §9: every route lives under /api/v1.
  app.setGlobalPrefix('api/v1');

  // The JWT arrives as an httpOnly cookie (D-04), so it has to be parsed
  // before any guard can read it.
  app.use(cookieParser());

  // Credentialed CORS cannot use a wildcard origin, so this is one exact
  // origin from config (requirements §11).
  app.enableCors({
    origin: config.getOrThrow<string>('WEB_ORIGIN'),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      // Strip anything not declared on the DTO...
      whitelist: true,
      // ...and reject it outright, so `{ isAdmin: true }` is a 400 rather than
      // a silently ignored field (API-ERR-04, security-validate-all-input).
      forbidNonWhitelisted: true,
      // Turn plain JSON into DTO instances so @Type() conversions apply.
      transform: true,
      // NOTE: the exceptionFactory that reshapes these into
      // { error: { code, message, fields } } arrives in Day 3 Slice 2, written
      // test-first against API-ERR-01..05. Until then Nest's default shape
      // applies — which is exactly why those tests will fail first.
    }),
  );

  // Lets Nest run onModuleDestroy (closing the Prisma pool) on SIGTERM
  // (devops-graceful-shutdown).
  app.enableShutdownHooks();

  return app;
}
