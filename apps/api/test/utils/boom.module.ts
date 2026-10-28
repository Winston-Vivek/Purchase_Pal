import { Controller, Get, Module } from '@nestjs/common';
import { Public } from '../../src/auth/public.decorator';

/**
 * A route that throws something the app does not expect, so API-ERR-03 can
 * prove the global filter turns an unknown error into 500 INTERNAL without
 * leaking a stack trace.
 *
 * It lives under test/ and is imported only by createTestApp, so it is never
 * compiled into dist and cannot reach a running server.
 */
@Public()
@Controller('boom')
export class BoomController {
  @Get()
  explode(): never {
    throw new Error('Kaboom: a secret-looking internal detail');
  }
}

@Module({ controllers: [BoomController] })
export class BoomModule {}
