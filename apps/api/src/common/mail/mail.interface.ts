/** One message, already rendered. The mailer does not know what it is sending. */
export interface Mail {
  to: string;
  subject: string;
  /** Always present. A link that only works in an HTML client is a broken link. */
  text: string;
  html?: string;
}

export interface Mailer {
  send(mail: Mail): Promise<void>;
}

/**
 * Injection token, like STORAGE (di-use-interfaces-tokens).
 *
 * Every test gets a recorder instead of a socket: no suite is allowed to
 * depend on an SMTP server being up, and asserting on a real subject line
 * beats asserting that a mock was called.
 */
export const MAILER = Symbol('MAILER');
