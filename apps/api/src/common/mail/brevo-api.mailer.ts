import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Mail, Mailer } from './mail.interface';

export const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

/**
 * Sends through Brevo's REST API rather than SMTP.
 *
 * Not a preference. Render's free instances block outbound traffic on ports
 * 25, 465 and 587, so `SmtpMailer` cannot get a packet out of the container —
 * and because sending is best-effort, that failure is invisible. This is
 * ordinary HTTPS on 443, which is not blocked.
 *
 * `SmtpMailer` stays the implementation for local development, where Mailpit
 * catches everything and no API key exists. The two are chosen between by
 * MAIL_DRIVER in mail.module.ts.
 */
@Injectable()
export class BrevoApiMailer implements Mailer {
  private readonly logger = new Logger(BrevoApiMailer.name);
  private readonly apiKey: string;
  private readonly sender: { name?: string; email: string };

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('BREVO_API_KEY') ?? '';
    this.sender = BrevoApiMailer.parseFrom(config.getOrThrow<string>('MAIL_FROM'));
  }

  /**
   * MAIL_FROM is one string everywhere else ("Name <addr>", which is what an
   * SMTP header wants). Brevo wants the two halves separately, so this is the
   * one place that knows about both shapes.
   */
  private static parseFrom(from: string): { name?: string; email: string } {
    const match = /^\s*(.*?)\s*<\s*([^>]+)\s*>\s*$/.exec(from);
    if (!match) return { email: from.trim() };

    // Indexed rather than destructured: under `strict`, a capture group is
    // `string | undefined` even when the pattern guarantees it matched.
    const name = match[1] ?? '';
    const email = (match[2] ?? '').trim();
    return name === '' ? { email } : { name, email };
  }

  /**
   * Never throws — the same contract SmtpMailer keeps, and for the same
   * reason: a password reset that 500s because the provider is down tells an
   * attacker something true and the user something false. The failure is
   * logged, and the daily job retries on its next run.
   */
  async send(mail: Mail): Promise<void> {
    // No key means no call. Sending an unauthenticated request would only earn
    // a 401, and logging that every time hides the real problem: it is not
    // configured.
    if (this.apiKey === '') {
      this.logger.error(`Not sending "${mail.subject}": BREVO_API_KEY is not set`);
      return;
    }

    try {
      const response = await fetch(BREVO_ENDPOINT, {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          sender: this.sender,
          to: [{ email: mail.to }],
          subject: mail.subject,
          textContent: mail.text,
          // Omitted rather than sent empty: Brevo rejects an empty string.
          ...(mail.html === undefined ? {} : { htmlContent: mail.html }),
        }),
      });

      if (!response.ok) {
        // Brevo says why in the body, and the body is the only place it says
        // so -- an unverified sender and a bad key both arrive as a 4xx.
        const detail = await response.text().catch(() => '');
        this.logger.error(
          `Brevo refused "${mail.subject}" (HTTP ${response.status}): ${detail.slice(0, 300)}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Could not send "${mail.subject}": ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
