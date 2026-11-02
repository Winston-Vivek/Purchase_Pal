import { Mail } from './mail.interface';

/**
 * Every message, as plain functions.
 *
 * No template engine: there are a handful of messages and each is a few lines.
 * Text is written first and HTML wraps the same words, so nothing is ever only
 * visible in an HTML client.
 */

const SIGN_OFF = 'Purchase Tracker';

/** Minimal, inline-styled, table-free. Mail clients are not browsers. */
function wrap(heading: string, body: string): string {
  return [
    '<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#0F172A">',
    `<h1 style="font-size:18px;margin:0 0 12px">${escape(heading)}</h1>`,
    body,
    `<p style="color:#475569;font-size:13px;margin-top:24px">${SIGN_OFF}</p>`,
    '</div>',
  ].join('');
}

/** User-supplied text reaches these messages (a product name), and an email
 *  client renders HTML. Escaped, for the same reason Vue escapes by default. */
function escape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function passwordChanged(to: string, when: string): Mail {
  const text = [
    'Your Purchase Tracker password was changed.',
    '',
    `When: ${when}`,
    '',
    'If this was you, there is nothing to do. Every other device has been',
    'signed out.',
    '',
    'If it was not you, your account may be compromised — reset your password',
    'immediately and check your email account too.',
    '',
    SIGN_OFF,
  ].join('\n');

  return {
    to,
    subject: 'Your password was changed',
    text,
    html: wrap(
      'Your password was changed',
      `<p>When: <strong>${escape(when)}</strong></p>
       <p>If this was you, there is nothing to do. Every other device has been signed out.</p>
       <p><strong>If it was not you</strong>, your account may be compromised — reset your
       password immediately and check your email account too.</p>`,
    ),
  };
}

export function passwordReset(to: string, link: string, minutes: number): Mail {
  const text = [
    'Someone asked to reset the password for your Purchase Tracker account.',
    '',
    'Open this link to choose a new one:',
    link,
    '',
    `The link works once and expires in ${minutes} minutes.`,
    '',
    'If you did not ask for this, ignore this email. Your password has not',
    'changed and nobody has been given access.',
    '',
    SIGN_OFF,
  ].join('\n');

  return {
    to,
    subject: 'Reset your password',
    text,
    html: wrap(
      'Reset your password',
      `<p>Someone asked to reset the password for your Purchase Tracker account.</p>
       <p><a href="${escape(link)}" style="color:#1E40AF">Choose a new password</a></p>
       <p style="color:#475569">The link works once and expires in ${minutes} minutes.</p>
       <p>If you did not ask for this, ignore this email. Your password has not changed
       and nobody has been given access.</p>`,
    ),
  };
}

export function confirmEmailChange(to: string, link: string, minutes: number): Mail {
  const text = [
    'Confirm this address for your Purchase Tracker account.',
    '',
    'Open this link to finish the change:',
    link,
    '',
    `The link works once and expires in ${minutes} minutes.`,
    '',
    'Until you open it, nothing changes and your account keeps its current',
    'address. If you did not ask for this, ignore this email.',
    '',
    SIGN_OFF,
  ].join('\n');

  return {
    to,
    subject: 'Confirm your new email address',
    text,
    html: wrap(
      'Confirm your new email address',
      `<p>Confirm this address for your Purchase Tracker account.</p>
       <p><a href="${escape(link)}" style="color:#1E40AF">Finish the change</a></p>
       <p style="color:#475569">The link works once and expires in ${minutes} minutes.</p>
       <p>Until you open it, nothing changes and your account keeps its current address.</p>`,
    ),
  };
}

/** Sent to the address being left. No link in it: there is nothing for this
 *  reader to confirm, and a link here would be the thing to phish. */
export function emailChangeRequested(to: string, newEmail: string): Mail {
  const text = [
    'Someone asked to move your Purchase Tracker account to a new address:',
    '',
    `  ${newEmail}`,
    '',
    'Nothing has changed yet. It only takes effect when that address is',
    'confirmed.',
    '',
    'If this was not you, sign in and change your password now — whoever asked',
    'had access to your account.',
    '',
    SIGN_OFF,
  ].join('\n');

  return {
    to,
    subject: 'A change of email address was requested',
    text,
    html: wrap(
      'A change of email address was requested',
      `<p>Someone asked to move your Purchase Tracker account to
       <strong>${escape(newEmail)}</strong>.</p>
       <p>Nothing has changed yet. It only takes effect when that address is confirmed.</p>
       <p><strong>If this was not you</strong>, sign in and change your password now —
       whoever asked had access to your account.</p>`,
    ),
  };
}

export interface ReminderLine {
  productName: string;
  /** Already written out: "Return closes in 3 days", "Service due today". */
  summary: string;
  url: string;
}

/** One digest per person per day, not one email per deadline. Three separate
 *  emails on one morning is how a useful product becomes spam. */
export function deadlineDigest(to: string, lines: ReminderLine[]): Mail {
  const heading =
    lines.length === 1 ? '1 deadline needs attention' : `${lines.length} deadlines need attention`;

  const text = [
    heading,
    '',
    ...lines.map((line) => `• ${line.productName} — ${line.summary}\n  ${line.url}`),
    '',
    'Change how far ahead you are warned, or turn these off, in Settings.',
    '',
    SIGN_OFF,
  ].join('\n');

  return {
    to,
    subject: heading,
    text,
    html: wrap(
      heading,
      `<ul style="padding-left:18px">${lines
        .map(
          (line) =>
            `<li style="margin-bottom:8px"><a href="${escape(line.url)}" style="color:#1E40AF">${escape(
              line.productName,
            )}</a> — ${escape(line.summary)}</li>`,
        )
        .join('')}</ul>
       <p style="color:#475569;font-size:13px">Change how far ahead you are warned, or turn
       these off, in Settings.</p>`,
    ),
  };
}
