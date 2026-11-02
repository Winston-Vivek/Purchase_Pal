import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CronSecretGuard } from './cron-secret.guard';

/** API-CRON-02/03 from docs/test-cases.md §2.12. */
describe('CronSecretGuard', () => {
  const contextWith = (header?: string): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          header: (name: string) => (name === 'x-cron-secret' ? header : undefined),
        }),
      }),
    }) as unknown as ExecutionContext;

  const guardWith = (secret: string): CronSecretGuard =>
    new CronSecretGuard({ get: () => secret } as unknown as ConfigService);

  it('API-CRON-02 lets the right secret through', () => {
    expect(guardWith('swordfish').canActivate(contextWith('swordfish'))).toBe(true);
  });

  it('API-CRON-02 refuses the wrong secret', () => {
    expect(() => guardWith('swordfish').canActivate(contextWith('haddock'))).toThrow(
      UnauthorizedException,
    );
  });

  it('API-CRON-02 refuses a missing header', () => {
    expect(() => guardWith('swordfish').canActivate(contextWith())).toThrow(UnauthorizedException);
  });

  it('API-CRON-03 refuses everyone when no secret is configured', () => {
    // The alternative — treating an unset secret as "no check needed" — turns
    // a forgotten environment variable into an endpoint that emails everyone.
    expect(() => guardWith('').canActivate(contextWith(''))).toThrow(UnauthorizedException);
    expect(() => guardWith('').canActivate(contextWith('anything'))).toThrow(UnauthorizedException);
  });
});
