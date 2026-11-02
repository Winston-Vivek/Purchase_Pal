import { plainToInstance, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  ValidationOptions,
  registerDecorator,
  validateSync,
} from 'class-validator';

/**
 * Environment contract for the API.
 *
 * `nestjs-best-practices` (devops-use-config-module) asks for config that fails
 * fast. The point is narrow but important: a server that boots with a missing
 * DATABASE_URL or a guessable JWT_SECRET is worse than one that refuses to
 * start, because the failure then surfaces as a security hole in production
 * instead of a crash on line one.
 *
 * Every variable here appears in `.env.example` (NFR-10).
 */

export enum NodeEnv {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

/** Accepts any zone the host's ICU database knows, e.g. `Asia/Kolkata`. */
function IsTimeZone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'isTimeZone',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'string' || value.length === 0) return false;
          try {
            new Intl.DateTimeFormat('en-US', { timeZone: value });
            return true;
          } catch {
            return false;
          }
        },
        defaultMessage(): string {
          return '$property must be a valid IANA time zone, for example Asia/Kolkata';
        },
      },
    });
  };
}

export class EnvironmentVariables {
  @IsEnum(NodeEnv, { message: 'NODE_ENV must be development, test or production' })
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsString()
  @IsNotEmpty()
  @Matches(/^postgres(ql)?:\/\//, {
    message: 'DATABASE_URL must be a postgresql:// connection string',
  })
  DATABASE_URL!: string;

  /**
   * 32 characters is the floor, not a suggestion. A short secret makes the
   * session cookie forgeable, which would defeat every ownership check in the
   * app (BR-09). Generate one with `openssl rand -base64 48`.
   */
  @IsString()
  @MinLength(32, {
    message:
      'JWT_SECRET must be at least 32 characters. Generate one with: openssl rand -base64 48',
  })
  JWT_SECRET!: string;

  @IsString()
  @Matches(/^\d+[smhdw]$/, {
    message: 'JWT_EXPIRES_IN must look like 15m, 12h, 7d or 2w',
  })
  JWT_EXPIRES_IN: string = '7d';

  /** requirements §11: bcrypt cost >= 10. The minimum is enforced, not assumed. */
  @Type(() => Number)
  @IsInt()
  @Min(10, { message: 'BCRYPT_ROUNDS must be at least 10 (requirements §11)' })
  @Max(15, { message: 'BCRYPT_ROUNDS above 15 makes every login painfully slow' })
  BCRYPT_ROUNDS: number = 12;

  /**
   * The one browser origin allowed to send credentialed requests. Credentialed
   * CORS cannot use `*`, so this must be an exact origin.
   */
  @IsString()
  @Matches(/^https?:\/\/[^/]+$/, {
    message: 'WEB_ORIGIN must be a bare origin such as http://localhost:5173 (no trailing path)',
  })
  WEB_ORIGIN: string = 'http://localhost:5173';

  /** BR-05 / D-10: the zone "today" is resolved in for every deadline. */
  @IsTimeZone()
  APP_TIMEZONE: string = 'Asia/Kolkata';

  /** BR-10 / NFR-11: receipt storage, which must stay outside any static route. */
  @IsString()
  @IsNotEmpty()
  UPLOAD_DIR: string = './var/uploads';

  /**
   * On for a managed Postgres, off for the one in docker-compose. Declared so
   * a missing value is a documented default rather than a surprise at boot.
   */
  @Type(() => Boolean)
  @IsBoolean()
  DATABASE_SSL: boolean = false;

  /**
   * How many attempts an address gets at the authentication endpoints before
   * they are refused, and over how many seconds.
   *
   * Five a minute is generous for a person and useless for a script. It
   * matters most for /auth/forgot-password, which sends mail to an address an
   * anonymous caller picks — unthrottled, that is an email-bombing tool.
   */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  THROTTLE_AUTH_LIMIT: number = 5;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  THROTTLE_AUTH_TTL: number = 60;

  /**
   * Shared with whatever calls the reminder endpoint. Empty means the
   * endpoint refuses everyone, which is the right default: a missing secret
   * must not become an open door.
   */
  @IsString()
  CRON_SECRET: string = '';

  // ------------------------------------------------------------------ mail --
  // Defaults point at the Mailpit container in docker-compose, which catches
  // everything locally. Any SMTP provider works by changing these four.

  @IsString()
  @IsNotEmpty()
  SMTP_HOST: string = 'localhost';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  SMTP_PORT: number = 1025;

  /** Empty for Mailpit, which accepts anything. A real provider needs both. */
  @IsString()
  SMTP_USER: string = '';

  @IsString()
  SMTP_PASS: string = '';

  @IsString()
  @IsNotEmpty()
  MAIL_FROM: string = 'Purchase Tracker <no-reply@purchasetracker.local>';

  /**
   * The base for links in emails.
   *
   * Deliberately from config and never from a request header: a reset link
   * built from the Host header can be rewritten by whoever sends the request,
   * which turns "reset your password" into a credential harvester.
   */
  @IsString()
  @Matches(/^https?:\/\/[^/]+$/, {
    message: 'APP_URL must be a bare origin such as http://localhost:5173',
  })
  APP_URL: string = 'http://localhost:5173';
}

/**
 * Passed to `ConfigModule.forRoot({ validate })`. Nest uses the returned
 * instance as the config source, so `ConfigService.get('PORT')` hands back a
 * real number rather than the string Node put in `process.env`.
 */
export function validateEnv(raw: Record<string, unknown>): EnvironmentVariables {
  const config = plainToInstance(EnvironmentVariables, raw, {
    // process.env holds hundreds of unrelated keys; take only what we declared.
    excludeExtraneousValues: false,
  });

  const errors = validateSync(config, {
    skipMissingProperties: false,
    forbidUnknownValues: false,
  });

  if (errors.length > 0) {
    const details = errors
      .map((error) => {
        const messages = Object.values(error.constraints ?? {}).join('; ');
        return `  - ${error.property}: ${messages}`;
      })
      .join('\n');

    throw new Error(
      `Invalid environment.\n\n${details}\n\n` +
        `Fix your .env (copy .env.example if you have not yet) and start again.\n`,
    );
  }

  return config;
}
