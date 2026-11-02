import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import { Mail, Mailer } from './mail.interface';

/**
 * Plain SMTP, so the provider is a matter of configuration rather than code.
 * The defaults point at the Mailpit container, which catches everything
 * locally and relays nothing.
 */
@Injectable()
export class SmtpMailer implements Mailer {
  private readonly logger = new Logger(SmtpMailer.name);
  private readonly transport: Transporter;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const user = this.config.get<string>('SMTP_USER') ?? '';
    const pass = this.config.get<string>('SMTP_PASS') ?? '';

    this.transport = createTransport({
      host: this.config.getOrThrow<string>('SMTP_HOST'),
      port: this.config.getOrThrow<number>('SMTP_PORT'),
      // Mailpit speaks plain SMTP on 1025; a real provider on 465 is implicit
      // TLS, and 587 upgrades with STARTTLS. Derived rather than configured,
      // so there is one fewer setting to get wrong.
      secure: this.config.getOrThrow<number>('SMTP_PORT') === 465,
      ...(user === '' ? {} : { auth: { user, pass } }),
    });

    this.from = this.config.getOrThrow<string>('MAIL_FROM');
  }

  /**
   * Never throws.
   *
   * Sending is best-effort: a password reset that 500s because SMTP is down
   * tells an attacker something useful and the user something false. The
   * failure is logged, and the daily job retries on its next run.
   */
  async send(mail: Mail): Promise<void> {
    try {
      await this.transport.sendMail({
        from: this.from,
        to: mail.to,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      });
    } catch (error) {
      this.logger.error(
        `Could not send "${mail.subject}": ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
