import { Mail, Mailer } from './mail.interface';

/** The mailer the tests use. Keeps what was sent so a test can read it. */
export class RecordingMailer implements Mailer {
  readonly sent: Mail[] = [];

  send(mail: Mail): Promise<void> {
    this.sent.push(mail);
    return Promise.resolve();
  }

  /** Every message to one address, oldest first. */
  to(address: string): Mail[] {
    return this.sent.filter((mail) => mail.to === address);
  }

  clear(): void {
    this.sent.length = 0;
  }
}
