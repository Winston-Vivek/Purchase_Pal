import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { deletePurchase, hasHorizontalScroll, isoToday, purchaseIdFrom, signIn } from './helpers';

const RECEIPT = resolve('apps/api/test/fixtures/receipt.pdf');

/**
 * E2E-08: the E2E-02 to E2E-04 journey at 390 x 844.
 *
 * Checked after every step rather than once at the end, because a layout that
 * only overflows while a dialog is open, or once a long product name is on the
 * page, is exactly the kind that ships.
 */
test.describe('On a phone', () => {
  test('E2E-08 add, upload and log a service, with nothing spilling sideways', async ({
    page,
    context,
  }) => {
    await signIn(context);

    await page.goto('/dashboard');
    expect(await hasHorizontalScroll(page)).toBe(false);
    // ui-guide §5: the bottom tab bar is the navigation at this width.
    await expect(page.getByRole('link', { name: /^dashboard$/i })).toBeVisible();

    await page.goto('/purchases/new');
    await page.fill('#productName', 'E2E Phone Journey Item With A Long Name');
    await page.fill('#price', '24900');
    await page.fill('#purchaseDate', isoToday());
    await page.fill('#returnWindowDays', '7');
    await page.check('#hasWarranty');
    await page.fill('#warrantyStartDate', isoToday());
    await page.fill('#warrantyLength', '12');
    expect(await hasHorizontalScroll(page)).toBe(false);

    await page.getByRole('button', { name: /save purchase/i }).click();
    await expect(page).toHaveURL(/\/purchases\/[0-9a-f-]{36}$/);
    const id = purchaseIdFrom(page);
    expect(await hasHorizontalScroll(page)).toBe(false);

    await page.locator('input[type=file]').setInputFiles(RECEIPT);
    await expect(page.getByText('Receipts 1 of 5')).toBeVisible();
    expect(await hasHorizontalScroll(page)).toBe(false);

    await page.getByRole('button', { name: /add service record/i }).click();
    await page.fill('#description', 'Replaced the cooling fan after a long description');
    await page.fill('#cost', '1450');
    // A dialog is the easiest way to overflow a narrow screen.
    expect(await hasHorizontalScroll(page)).toBe(false);
    await page.getByRole('button', { name: /add record/i }).click();

    await expect(page.getByText('Replaced the cooling fan after a long description')).toBeVisible();
    expect(await hasHorizontalScroll(page)).toBe(false);

    // The list is cards at this width, not a table (ui-guide §6 S3).
    await page.goto('/purchases');
    await expect(page.locator('table')).toBeHidden();
    expect(await hasHorizontalScroll(page)).toBe(false);

    await deletePurchase(context, id);
  });
});
