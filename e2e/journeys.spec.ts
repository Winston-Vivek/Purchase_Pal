import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import {
  DEMO,
  OTHER,
  asDisplayed,
  deletePurchase,
  hasHorizontalScroll,
  isoToday,
  plusDays,
  purchaseIdFrom,
  signIn,
  twelveMonthWarrantyEnd,
  setAlertWindows,
} from './helpers';

const RECEIPT = resolve('apps/api/test/fixtures/receipt.pdf');

test.describe('Proofly journeys', () => {
  test('E2E-01 a new account lands on a dashboard that invites a first purchase', async ({
    page,
  }) => {
    const email = `e2e-${Date.now()}@proofly.test`;

    await page.goto('/register');
    await page.fill('#name', 'E2E Tester');
    await page.fill('#email', email);
    await page.fill('#password', 'Passw0rd1');
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText(/add your first purchase/i)).toBeVisible();
    expect(await hasHorizontalScroll(page)).toBe(false);
  });

  test('E2E-02 a purchase saved with a window and a warranty shows the right dates', async ({
    page,
    context,
  }) => {
    await signIn(context);

    await page.goto('/purchases/new');
    await page.fill('#productName', 'E2E AirPods Pro');
    await page.fill('#seller', 'Amazon');
    await page.fill('#price', '24900');
    await page.fill('#purchaseDate', isoToday());
    await page.fill('#returnWindowDays', '7');
    await page.check('#hasWarranty');
    // The start already holds the purchase date and is locked to it
    // (FE-PAGE-40), so there is nothing to type here any more.
    await expect(page.locator('#warrantyStartDate')).toHaveValue(isoToday());
    await page.fill('#warrantyLength', '12');

    // The form says what it is about to save, before it saves it.
    await expect(page.getByText(`Return closes ${asDisplayed(plusDays(7))}`)).toBeVisible();

    await page.getByRole('button', { name: /save purchase/i }).click();
    await expect(page).toHaveURL(/\/purchases\/[0-9a-f-]{36}$/);

    // And the stored values agree with what it promised.
    await expect(page.getByText(asDisplayed(plusDays(7)))).toBeVisible();
    await expect(page.getByText(asDisplayed(twelveMonthWarrantyEnd()))).toBeVisible();
    await expect(page.getByText(/7-day window from/i)).toBeVisible();

    await deletePurchase(context, purchaseIdFrom(page));
  });

  test('E2E-03 a receipt uploads and downloads back byte for byte', async ({ page, context }) => {
    await signIn(context);

    await page.goto('/purchases/new');
    await page.fill('#productName', 'E2E Receipt Holder');
    await page.fill('#price', '999');
    await page.fill('#purchaseDate', isoToday());
    await page.getByRole('button', { name: /save purchase/i }).click();
    await expect(page).toHaveURL(/\/purchases\/[0-9a-f-]{36}$/);
    const id = purchaseIdFrom(page);

    await expect(page.getByText('Receipts 0 of 5')).toBeVisible();
    await page.locator('input[type=file]').setInputFiles(RECEIPT);

    await expect(page.getByText('Receipts 1 of 5')).toBeVisible();
    await expect(page.getByText('receipt.pdf').first()).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page
        .getByRole('link', { name: /download/i })
        .first()
        .click(),
    ]);

    expect(download.suggestedFilename()).toBe('receipt.pdf');
    const sha = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');
    expect(sha((await download.path()) as string)).toBe(sha(RECEIPT));

    await deletePurchase(context, id);
  });

  test('E2E-04 a service record survives a reload', async ({ page, context }) => {
    await signIn(context);

    await page.goto('/purchases/new');
    await page.fill('#productName', 'E2E Serviced Item');
    await page.fill('#price', '5000');
    await page.fill('#purchaseDate', isoToday());
    await page.getByRole('button', { name: /save purchase/i }).click();
    await expect(page).toHaveURL(/\/purchases\/[0-9a-f-]{36}$/);
    const id = purchaseIdFrom(page);

    await page.getByRole('button', { name: /add service record/i }).click();
    await page.fill('#description', 'Replaced the cooling fan');
    await page.fill('#provider', 'Croma Service Centre');
    await page.fill('#cost', '1450');
    await page.getByRole('button', { name: /add record/i }).click();

    await expect(page.getByText('Replaced the cooling fan')).toBeVisible();

    await page.reload();
    await expect(page.getByText('Replaced the cooling fan')).toBeVisible();
    // The header total is derived from the records, so it proves the save.
    await expect(page.getByTestId('service-history').getByText('₹1,450.00')).toBeVisible();
    await expect(page.locator('dt:has-text("Spent on service") + dd')).toHaveText('₹1,450.00');

    await deletePurchase(context, id);
  });

  test('E2E-05 a deadline inside the alert window is on the dashboard', async ({
    page,
    context,
  }) => {
    await signIn(context);
    // The whole point of this journey is a deadline inside the window, so it
    // states the window instead of hoping for the default.
    const windows = await setAlertWindows(context, {
      warrantyAlertDays: 30,
      returnAlertDays: 7,
    });

    await page.goto('/purchases/new');
    await page.fill('#productName', 'E2E Closing Soon');
    await page.fill('#price', '1200');
    await page.fill('#purchaseDate', isoToday());
    await page.fill('#returnWindowDays', '3');
    await page.getByRole('button', { name: /save purchase/i }).click();
    await expect(page).toHaveURL(/\/purchases\/[0-9a-f-]{36}$/);
    const id = purchaseIdFrom(page);

    await page.goto('/dashboard');
    const needsAction = page.getByTestId('needs-action');
    await expect(needsAction.getByText('E2E Closing Soon').first()).toBeVisible();
    await expect(needsAction.getByText(/closes in 3 days/i).first()).toBeVisible();

    await deletePurchase(context, id);
    await setAlertWindows(context, windows);
  });

  test('E2E-06 search finds a purchase and an edit to it sticks', async ({ page, context }) => {
    await signIn(context);

    await page.goto('/purchases');
    await page.fill('#q', 'AirPods');
    await page.getByRole('button', { name: /^search$/i }).click();

    await page
      .getByRole('link', { name: /AirPods/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/purchases\/[0-9a-f-]{36}$/);
    const url = page.url();

    await page.getByRole('link', { name: /^edit$/i }).click();
    await page.fill('#seller', 'Croma');
    await page.getByRole('button', { name: /save changes/i }).click();

    await page.goto(url);
    await expect(page.getByText('Bought from Croma')).toBeVisible();

    // Put the seeded value back, so a second run starts where this one did.
    await page.getByRole('link', { name: /^edit$/i }).click();
    await page.fill('#seller', 'Amazon');
    await page.getByRole('button', { name: /save changes/i }).click();
    await expect(page.getByText('Bought from Amazon')).toBeVisible();
  });

  test("E2E-07 another user gets nothing from A's purchase or receipt URL", async ({ browser }) => {
    // A creates a purchase with a receipt.
    const a = await browser.newContext();
    await signIn(a, DEMO);
    const created = await a.request.post('/api/v1/purchases', {
      data: {
        productName: 'E2E Private Thing',
        category: 'OTHER',
        purchaseDate: isoToday(),
        price: 100,
      },
    });
    const purchase = await created.json();
    const upload = await a.request.post(`/api/v1/purchases/${purchase.id}/attachments`, {
      multipart: {
        file: { name: 'receipt.pdf', mimeType: 'application/pdf', buffer: readFileSync(RECEIPT) },
      },
    });
    const attachment = await upload.json();

    // B goes looking.
    const b = await browser.newContext();
    await signIn(b, OTHER);
    const page = await b.newPage();

    const responses: string[] = [];
    page.on('response', async (response) => {
      if (!response.url().includes('/api/v1/')) return;
      responses.push(await response.text().catch(() => ''));
    });

    await page.goto(`/purchases/${purchase.id}`);
    await expect(page.getByText(/purchase not found/i)).toBeVisible();
    await expect(page.getByText('E2E Private Thing')).toHaveCount(0);
    // BR-09 returns 404, never 403, so nothing may hint the record exists.
    await expect(page.getByText(/permission|forbidden|not allowed/i)).toHaveCount(0);

    const receipt = await b.request.get(`/api/v1/attachments/${attachment.id}`);
    expect(receipt.status()).toBe(404);

    // Nothing of A's reached B over the wire.
    expect(responses.join('\n')).not.toContain('E2E Private Thing');

    await deletePurchase(a, purchase.id);
    await a.close();
    await b.close();
  });
});
