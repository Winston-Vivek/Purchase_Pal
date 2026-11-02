import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MAILER } from './mail.interface';
import { SmtpMailer } from './smtp.mailer';

/** Global: four unrelated features send mail, and none of them should have to
 *  import a module to do it. */
@Global()
@Module({
  providers: [
    {
      provide: MAILER,
      useFactory: (config: ConfigService) => new SmtpMailer(config),
      inject: [ConfigService],
    },
  ],
  exports: [MAILER],
})
export class MailModule {}
