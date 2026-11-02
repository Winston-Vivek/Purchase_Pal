import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatesModule } from '../common/dates/dates.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PasswordChangeService } from './password-change.service';
import { PasswordResetService } from './password-reset.service';

/** Shape EnvironmentVariables already enforces with /^\d+[smhdw]$/. */
type Duration = `${number}${'s' | 'm' | 'h' | 'd' | 'w'}`;

@Module({
  imports: [
    UsersModule,
    DatesModule,
    // In-memory storage: one container, and a limit that resets on deploy is
    // still a limit. A shared store (Redis) is what multiple instances would
    // need, and is noted in security.md rather than built for one.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          name: 'auth',
          ttl: config.getOrThrow<number>('THROTTLE_AUTH_TTL') * 1000,
          limit: config.getOrThrow<number>('THROTTLE_AUTH_LIMIT'),
        },
      ],
    }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        // Never a literal: the secret is the only thing standing between a
        // forged cookie and someone else's purchases.
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.getOrThrow<string>('JWT_EXPIRES_IN') as Duration },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordResetService,
    PasswordChangeService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AuthModule {}
