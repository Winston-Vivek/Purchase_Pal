// The decorators are read at module load, so the polyfill has to come first.
// main.ts gets this from Nest; a bare unit test does not.
import 'reflect-metadata';
import { validateEnv } from './env.validation';

/**
 * The environment is parsed from strings, and `process.env` has no booleans.
 * That is the whole hazard here: `Boolean('false')` is `true`, so a flag read
 * the naive way is on no matter what it is set to.
 *
 * DATABASE_SSL is the one that matters. `.env.example` ships
 * `DATABASE_SSL=false` for the docker-compose Postgres, which offers no
 * certificate — getting `true` out of that line means a fresh clone cannot
 * connect at all.
 */
describe('validateEnv', () => {
  const valid = {
    DATABASE_URL: 'postgresql://proofly:proofly@localhost:5434/proofly',
    JWT_SECRET: 'x'.repeat(32),
  };

  describe('DATABASE_SSL', () => {
    it('is on for the string "true" (what a managed Postgres needs)', () => {
      expect(validateEnv({ ...valid, DATABASE_SSL: 'true' }).DATABASE_SSL).toBe(true);
    });

    it('is OFF for the string "false" — the line .env.example ships', () => {
      expect(validateEnv({ ...valid, DATABASE_SSL: 'false' }).DATABASE_SSL).toBe(false);
    });

    it('defaults to off when unset', () => {
      expect(validateEnv({ ...valid }).DATABASE_SSL).toBe(false);
    });

    it('is off for an empty value, rather than failing to boot', () => {
      expect(validateEnv({ ...valid, DATABASE_SSL: '' }).DATABASE_SSL).toBe(false);
    });

    it('accepts a real boolean, for tests that build the object directly', () => {
      expect(validateEnv({ ...valid, DATABASE_SSL: true }).DATABASE_SSL).toBe(true);
    });
  });

  describe('MAIL_DRIVER', () => {
    it('defaults to smtp, which is what Mailpit speaks locally', () => {
      expect(validateEnv({ ...valid }).MAIL_DRIVER).toBe('smtp');
    });

    it("accepts 'brevo-api', for hosts that block outbound SMTP", () => {
      expect(validateEnv({ ...valid, MAIL_DRIVER: 'brevo-api' }).MAIL_DRIVER).toBe('brevo-api');
    });

    it('refuses a transport that does not exist, rather than falling back', () => {
      expect(() => validateEnv({ ...valid, MAIL_DRIVER: 'sendgrid' })).toThrow(/MAIL_DRIVER/);
    });
  });

  describe('the guarantees worth keeping', () => {
    it('refuses a JWT_SECRET short enough to brute force', () => {
      expect(() => validateEnv({ ...valid, JWT_SECRET: 'tooshort' })).toThrow(/JWT_SECRET/);
    });

    it('refuses a DATABASE_URL that is not a postgres connection string', () => {
      expect(() => validateEnv({ ...valid, DATABASE_URL: 'mysql://nope' })).toThrow(/DATABASE_URL/);
    });

    it('turns PORT into a number, not the string process.env holds', () => {
      expect(validateEnv({ ...valid, PORT: '3001' }).PORT).toBe(3001);
    });
  });
});
