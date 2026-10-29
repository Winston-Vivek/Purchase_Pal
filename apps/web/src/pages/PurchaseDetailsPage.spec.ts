import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FileDrop from '../components/FileDrop.vue';
import PurchaseDetailsPage from './PurchaseDetailsPage.vue';

const route = { params: { purchaseId: 'p1' } as Record<string, string>, query: {} };

vi.mock('vue-router', async (original) => ({
  ...(await original<typeof import('vue-router')>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useRoute: () => route,
}));

const SAMSUNG = {
  id: 'p1',
  productName: 'Samsung 1.5 Ton Inverter Split AC',
  category: 'APPLIANCES',
  seller: 'Croma',
  purchaseDate: '2025-11-02',
  price: 42990,
  currency: 'INR',
  returnWindowDays: null,
  warrantyStartDate: '2025-11-02',
  warrantyMonths: 12,
  notes: null,
  returnDeadline: null,
  returnStatus: 'NOT_SET',
  returnDaysLeft: null,
  warrantyExpiry: '2026-11-01',
  warrantyStatus: 'EXPIRING_SOON',
  warrantyDaysLeft: 5,
  hasReceipt: false,
  attachments: [],
  serviceRecords: [],
};

/** FE-PAGE-13..17 from docs/test-cases.md §4. */
describe('Purchase details', () => {
  const fetchMock = vi.fn();

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    route.params = { purchaseId: 'p1' };
  });

  afterEach(() => vi.unstubAllGlobals());

  const page = async (purchase: unknown = SAMSUNG) => {
    fetchMock.mockResolvedValueOnce(json(200, purchase));
    const wrapper = mount(PurchaseDetailsPage, {
      global: {
        stubs: {
          AppShell: { template: '<div><slot /></div>' },
          RouterLink: { template: '<a href="#"><slot /></a>' },
        },
      },
    });
    await flushPromises();
    return wrapper;
  };

  it('FE-PAGE-13 the header carries the facts about the purchase', async () => {
    const wrapper = await page();
    const text = wrapper.text();

    expect(text).toContain('Samsung 1.5 Ton Inverter Split AC');
    expect(text).toContain('Croma');
    expect(text).toContain('₹42,990.00');
    expect(text).toContain('2 Nov 2025');
  });

  it('FE-PAGE-13 each panel shows the date, the badge, and HOW it was worked out', async () => {
    const wrapper = await page();
    const text = wrapper.text();

    // The date itself.
    expect(text).toContain('1 Nov 2026');
    // The badge.
    expect(text).toContain('Warranty ends in 5 days');
    // And the rule behind it — a user checking against the card in the box
    // needs to see why this date, not just trust it (ui-guide §6 S4).
    expect(text).toMatch(/12 months from/i);
    expect(text).toContain('2 Nov 2025');
  });

  it('FE-PAGE-13 a purchase with no return window says so plainly', async () => {
    const wrapper = await page();

    expect(wrapper.text()).toContain('No return window');
    expect(wrapper.text()).toMatch(/no return deadline is tracked/i);
  });

  it('FE-PAGE-13 a return from a window explains the window', async () => {
    const wrapper = await page({
      ...SAMSUNG,
      returnWindowDays: 7,
      returnDeadline: '2025-11-09',
      returnStatus: 'EXPIRED',
      returnDaysLeft: -354,
    });

    expect(wrapper.text()).toMatch(/7-day window from 2 Nov 2025/i);
  });

  it('FE-PAGE-13 a hand-entered deadline says it was entered, not calculated', async () => {
    const wrapper = await page({
      ...SAMSUNG,
      returnWindowDays: null,
      returnDeadline: '2025-12-24',
      returnStatus: 'EXPIRED',
      returnDaysLeft: -300,
    });

    expect(wrapper.text()).toMatch(/entered manually/i);
  });

  it('FE-PAGE-14 with no receipt it says so and offers to fix it', async () => {
    const wrapper = await page();

    expect(wrapper.text()).toContain('Receipt missing');
    expect(wrapper.text()).toMatch(/upload|drop the/i);
  });

  it('FE-PAGE-15 an uploaded receipt appears in the list and the count moves', async () => {
    const wrapper = await page();
    expect(wrapper.text()).toMatch(/0 of 5/);

    fetchMock.mockResolvedValueOnce(
      json(201, {
        id: 'a1',
        fileName: 'croma-invoice.pdf',
        mimeType: 'application/pdf',
        fileSize: 412_000,
        uploadedAt: '2026-10-29T10:00:00.000Z',
      }),
    );

    const file = new File([new Uint8Array(1024)], 'croma-invoice.pdf', { type: 'application/pdf' });
    wrapper.findComponent(FileDrop).vm.$emit('select', file);
    await flushPromises();

    const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(url).toBe('/api/v1/purchases/p1/attachments');
    expect(init.method).toBe('POST');
    // Multipart, so the browser sets its own boundary — never JSON.
    expect(init.body).toBeInstanceOf(FormData);

    expect(wrapper.text()).toContain('croma-invoice.pdf');
    expect(wrapper.text()).toMatch(/1 of 5/);
    // The banner goes once there is a receipt (BR-06).
    expect(wrapper.text()).not.toContain('Receipt missing');
  });

  it('FE-PAGE-16 a rejected upload explains itself and changes nothing', async () => {
    const wrapper = await page();

    fetchMock.mockResolvedValueOnce(
      json(415, {
        error: {
          code: 'UNSUPPORTED_MEDIA_TYPE',
          message: 'Upload a PDF, JPEG, PNG or WEBP file',
        },
      }),
    );

    const file = new File([new Uint8Array(16)], 'notes.txt', { type: 'application/pdf' });
    wrapper.findComponent(FileDrop).vm.$emit('select', file);
    await flushPromises();

    expect(wrapper.text()).toContain('Upload a PDF, JPEG, PNG or WEBP file');
    expect(wrapper.text()).toMatch(/0 of 5/);
    expect(wrapper.text()).toContain('Receipt missing');
  });

  it('FE-PAGE-17 a purchase that is not yours reads as not found, with a way back', async () => {
    fetchMock.mockResolvedValueOnce(
      json(404, { error: { code: 'NOT_FOUND', message: 'Purchase not found' } }),
    );

    const wrapper = mount(PurchaseDetailsPage, {
      global: {
        stubs: {
          AppShell: { template: '<div><slot /></div>' },
          RouterLink: { template: '<a href="#"><slot /></a>' },
        },
      },
    });
    await flushPromises();

    expect(wrapper.text()).toMatch(/not found/i);
    expect(wrapper.text()).toMatch(/my purchases|back/i);
    // 404 is what BR-09 returns for someone else's purchase, so this must not
    // leak that it exists.
    expect(wrapper.text()).not.toMatch(/permission|forbidden|not allowed/i);
  });

  it('shows the receipts already attached, with their size', async () => {
    const wrapper = await page({
      ...SAMSUNG,
      hasReceipt: true,
      attachments: [
        {
          id: 'a1',
          fileName: 'Croma-invoice-INV-88213.pdf',
          mimeType: 'application/pdf',
          fileSize: 412_000,
          uploadedAt: '2025-11-02T10:00:00.000Z',
        },
      ],
    });

    expect(wrapper.text()).toContain('Croma-invoice-INV-88213.pdf');
    expect(wrapper.text()).toMatch(/402|412|0\.4/);
    expect(wrapper.text()).toMatch(/1 of 5/);
  });
});
