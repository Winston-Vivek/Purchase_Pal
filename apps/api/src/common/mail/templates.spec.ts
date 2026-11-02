import { deadlineDigest, passwordChanged, passwordReset } from './templates';

/**
 * UT-MAIL-01..05 from docs/test-cases.md §1.5.
 *
 * The properties that matter are the ones a mistake here would make invisible:
 * the link is in the plain-text part, user content is escaped, and a digest is
 * one message rather than several.
 */
describe('Email templates', () => {
  describe('UT-MAIL-01 the reset email', () => {
    const link = 'http://localhost:5173/reset-password?token=abc123';

    it('UT-MAIL-01 puts the link in the plain text, not only the HTML', () => {
      const mail = passwordReset('ada@test.dev', link, 30);

      // A client showing plain text must still be able to reset a password.
      expect(mail.text).toContain(link);
      expect(mail.html).toContain(link);
    });

    it('UT-MAIL-01 says how long it lasts and that ignoring it is safe', () => {
      const mail = passwordReset('ada@test.dev', link, 30);

      expect(mail.text).toContain('30 minutes');
      expect(mail.text).toMatch(/ignore this email/i);
      expect(mail.text).toMatch(/password has not\s*\n?changed/i);
    });

    it('UT-MAIL-02 never contains a password', () => {
      const mail = passwordReset('ada@test.dev', link, 30);

      expect(mail.text).not.toMatch(/Passw0rd/);
      expect(mail.subject).toBe('Reset your password');
    });
  });

  describe('UT-MAIL-03 the password-changed notice', () => {
    it('UT-MAIL-03 tells the reader what to do if it was not them', () => {
      const mail = passwordChanged('ada@test.dev', '2 Nov 2026, 14:05');

      expect(mail.text).toContain('2 Nov 2026, 14:05');
      expect(mail.text).toMatch(/if it was not you/i);
      expect(mail.text).toMatch(/signed out/i);
    });
  });

  describe('UT-MAIL-04 the deadline digest', () => {
    const lines = [
      { productName: 'AirPods Pro', summary: 'Return closes in 3 days', url: 'http://x/p1' },
      { productName: 'Samsung AC', summary: 'Service due today', url: 'http://x/p2' },
    ];

    it('UT-MAIL-04 is one message naming every deadline', () => {
      const mail = deadlineDigest('ada@test.dev', lines);

      expect(mail.subject).toBe('2 deadlines need attention');
      expect(mail.text).toContain('AirPods Pro');
      expect(mail.text).toContain('Samsung AC');
      expect(mail.text).toContain('http://x/p1');
    });

    it('UT-MAIL-04 counts one deadline in the singular', () => {
      const mail = deadlineDigest('ada@test.dev', [lines[0]!]);

      expect(mail.subject).toBe('1 deadline needs attention');
    });

    it('UT-MAIL-05 escapes a product name, because a mail client renders HTML', () => {
      const mail = deadlineDigest('ada@test.dev', [
        { ...lines[0]!, productName: '<script>alert(1)</script>' },
      ]);

      expect(mail.html).not.toContain('<script>');
      expect(mail.html).toContain('&lt;script&gt;');
      // The plain text is not markup, so it keeps the characters as typed.
      expect(mail.text).toContain('<script>');
    });
  });
});
