import type { BrowserContext, Page } from '@playwright/test';

/**
 * D-10: the API resolves "today" in Asia/Kolkata. A journey that builds dates
 * from the runner's UTC or local clock disagrees with the app for part of
 * every day — which is how this file first failed, asserting 5 Nov while the
 * form had been given 28 Oct.
 */
const APP_TIMEZONE = 'Asia/Kolkata';

export const isoToday = (): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

const fromIso = (iso: string): Date =>
  new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));

/** Formatted the way ui-guide §3 asks, so it can be compared with the page. */
export const asDisplayed = (date: Date): string =>
  new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);

export const plusDays = (days: number): Date => {
  const date = fromIso(isoToday());
  date.setDate(date.getDate() + days);
  return date;
};

/** BR-01 for the ordinary case: a year on, one day back. Worked out here
 *  rather than read from the app, so the page is checked against something
 *  independent of it. */
export const twelveMonthWarrantyEnd = (): Date => {
  const start = fromIso(isoToday());
  return new Date(start.getFullYear() + 1, start.getMonth(), start.getDate() - 1);
};

export const DEMO = { email: 'demo@proofly.test', password: 'demo1234' };
export const OTHER = { email: 'other@proofly.test', password: 'demo1234' };

/** Signs in through the API so a journey spends its time on what it is
 *  testing. E2E-01 still exercises the real form. */
export async function signIn(
  context: BrowserContext,
  who: { email: string; password: string } = DEMO,
): Promise<void> {
  const response = await context.request.post('/api/v1/auth/login', { data: who });
  if (!response.ok()) throw new Error(`seed sign-in failed: ${response.status()}`);
}

/** Removes a purchase the journey created, so repeated runs stay identical
 *  and the demo data is left as it was found. */
export async function deletePurchase(context: BrowserContext, id: string): Promise<void> {
  await context.request.delete(`/api/v1/purchases/${id}`);
}

export function purchaseIdFrom(page: Page): string {
  const match = /\/purchases\/([0-9a-f-]{36})/.exec(page.url());
  if (!match?.[1]) throw new Error(`no purchase id in ${page.url()}`);
  return match[1];
}

/** NFR-01. Checked on every journey rather than once, because it is a layout
 *  regression that only shows up on a particular screen. */
export async function hasHorizontalScroll(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
}
