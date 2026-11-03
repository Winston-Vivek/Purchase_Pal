import { ConfigService } from '@nestjs/config';
import { BrevoApiMailer, BREVO_ENDPOINT } from './brevo-api.mailer';

/**
 * Why this class exists at all: Render's free instances block outbound traffic
 * on ports 25, 465 and 587, so SMTP cannot leave the container. Brevo's REST
 * API is ordinary HTTPS on 443, which is not blocked.
 *
 * The contract it has to keep is the one SmtpMailer keeps: sending is
 * best-effort and `send` never throws. A password reset that 500s because the
 * mail provider is down tells an attacker something true and the user
 * something false.
 */
describe('BrevoApiMailer', () => {
  const config = (over: Record<string, string> = {}): ConfigService => {
    const values: Record<string, string> = {
      BREVO_API_KEY: 'test-key',
      MAIL_FROM: 'Purchase Tracker <no-reply@example.com>',
      ...over,
    };
    return {
      get: (k: string) => values[k],
      getOrThrow: (k: string) => {
        if (values[k] === undefined) throw new Error(`missing ${k}`);
        return values[k];
      },
    } as unknown as ConfigService;
  };

  const mail = {
    to: 'someone@example.com',
    subject: 'Reset your password',
    text: 'Open this link',
    html: '<p>Open this link</p>',
  };

  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest
      .fn()
      .mockResolvedValue({ ok: true, status: 201, text: () => Promise.resolve('') });
    global.fetch = fetchMock;
  });

  it('posts to Brevo over HTTPS, authenticated with the api-key header', async () => {
    await new BrevoApiMailer(config()).send(mail);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(url).toBe(BREVO_ENDPOINT);
    // 443, not an SMTP port -- the entire reason this class exists.
    expect(url.startsWith('https://')).toBe(true);
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['api-key']).toBe('test-key');
  });

  it('splits MAIL_FROM into the name and address Brevo wants', async () => {
    await new BrevoApiMailer(config()).send(mail);

    const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.sender).toEqual({ name: 'Purchase Tracker', email: 'no-reply@example.com' });
    expect(body.to).toEqual([{ email: 'someone@example.com' }]);
    expect(body.subject).toBe('Reset your password');
    expect(body.textContent).toBe('Open this link');
    expect(body.htmlContent).toBe('<p>Open this link</p>');
  });

  it('accepts a bare address in MAIL_FROM, with no display name', async () => {
    await new BrevoApiMailer(config({ MAIL_FROM: 'no-reply@example.com' })).send(mail);

    const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.sender).toEqual({ email: 'no-reply@example.com' });
  });

  it('omits htmlContent when the message has no HTML part', async () => {
    const { html: _html, ...textOnly } = mail;
    await new BrevoApiMailer(config()).send(textOnly);

    const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.htmlContent).toBeUndefined();
    expect(body.textContent).toBe('Open this link');
  });

  it('does not throw when Brevo rejects the message', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve('{"message":"sender not valid"}'),
    });

    await expect(new BrevoApiMailer(config()).send(mail)).resolves.toBeUndefined();
  });

  it('does not throw when the network fails outright', async () => {
    fetchMock.mockRejectedValue(new Error('getaddrinfo ENOTFOUND'));

    await expect(new BrevoApiMailer(config()).send(mail)).resolves.toBeUndefined();
  });

  it('sends nothing, rather than an unauthenticated call, with no API key', async () => {
    await new BrevoApiMailer(config({ BREVO_API_KEY: '' })).send(mail);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
