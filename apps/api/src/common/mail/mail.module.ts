import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailDriver } from '../../config/env.validation';
import { BrevoApiMailer } from './brevo-api.mailer';
import { MAILER } from './mail.interface';
import { SmtpMailer } from './smtp.mailer';

/** Global: four unrelated features send mail, and none of them should have to
 *  import a module to do it. */
@Global()
@Module({
  providers: [
    {
      provide: MAILER,
      /**
       * One token, two transports, chosen by configuration.
       *
       * SMTP is the right thing locally, where Mailpit catches everything.
       * It is the wrong thing on Render's free tier, which blocks outbound
       * ports 25, 465 and 587 -- and blocks them silently, because sending is
       * best-effort by design. `brevo-api` goes over ordinary HTTPS instead.
       */
      useFactory: (config: ConfigService) =>
        config.get<MailDriver>('MAIL_DRIVER') === MailDriver.BrevoApi
          ? new BrevoApiMailer(config)
          : new SmtpMailer(config),
      inject: [ConfigService],
    },
  ],
  exports: [MAILER],
})
export class MailModule {}
