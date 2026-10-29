import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PurchaseFormPage from './PurchaseFormPage.vue';

const push = vi.fn();
const route = { params: {} as Record<string, string>, query: {} };

vi.mock('vue-router', async (original) => ({
  ...(await original<typeof import('vue-router')>()),
  useRouter: () => ({ push, replace: push }),
  useRoute: () => route,
}));

/**
 * FE-PAGE-09..12 from docs/test-cases.md §4.
 *
 * Today is pinned to 2026-10-27, the same day the API tests use, because the
 * previews say how far away a deadline is and that only means something
 * against a fixed day.
 */
describe('Add and edit purchase', () => {
  const fetchMock = vi.fn();

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-10-27T06:00:00Z'));
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    push.mockReset();
    route.params = {};
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const form = () =>
    mount(PurchaseFormPage, {
      attachTo: document.body,
      global: {
        stubs: {
          AppShell: { template: '<div><slot /></div>' },
          RouterLink: { template: '<a href="#"><slot /></a>' },
        },
      },
    });

  const fill = async (wrapper: ReturnType<typeof mount>, values: Record<string, string>) => {
    for (const [id, value] of Object.entries(values)) {
      await wrapper.get(`#${id}`).setValue(value);
    }
  };

  it('FE-PAGE-09 the return preview shows the date and how far away it is', async () => {
    const wrapper = form();

    await fill(wrapper, { purchaseDate: '2026-10-27', returnWindowDays: '7' });
    await flushPromises();

    // The user sees the rule's answer before saving (ui-guide §6), so a
    // 7 day window is not something they have to work out themselves.
    expect(wrapper.text()).toContain('Return closes 3 Nov 2026');
    expect(wrapper.text()).toContain('in 7 days');
  });

  it('FE-PAGE-09 an exact date replaces the window, and says so', async () => {
    const wrapper = form();

    await fill(wrapper, { purchaseDate: '2026-10-27' });
    await wrapper.get('#returnMode-exact').setValue();
    await fill(wrapper, { returnDeadline: '2026-11-15' });
    await flushPromises();

    expect(wrapper.text()).toContain('Return closes 15 Nov 2026');
  });

  it('FE-PAGE-09 "no return" shows no deadline at all', async () => {
    const wrapper = form();

    await fill(wrapper, { purchaseDate: '2026-10-27', returnWindowDays: '7' });
    await wrapper.get('#returnMode-none').setValue();
    await flushPromises();

    expect(wrapper.text()).not.toContain('Return closes');
  });

  it('FE-PAGE-10 the warranty preview shows the last covered day', async () => {
    const wrapper = form();

    await fill(wrapper, { purchaseDate: '2026-10-27' });
    await wrapper.get('#hasWarranty').setValue(true);
    await fill(wrapper, { warrantyStartDate: '2026-10-27', warrantyLength: '12' });
    await flushPromises();

    // BR-01: 12 months from 27 Oct 2026 covers you through 26 Oct 2027.
    expect(wrapper.text()).toContain('Covered until 26 Oct 2027');
    expect(wrapper.text()).toContain('364 days');
  });

  it('FE-PAGE-10 the month-end clamp is visible in the preview too', async () => {
    const wrapper = form();

    await fill(wrapper, { purchaseDate: '2026-01-31' });
    await wrapper.get('#hasWarranty').setValue(true);
    await fill(wrapper, { warrantyStartDate: '2026-01-31', warrantyLength: '1' });
    await flushPromises();

    // 31 Jan + 1 month is 28 Feb, not 27 Feb. A user checking the preview
    // against the card in the box has to see the same answer the API stores.
    expect(wrapper.text()).toContain('Covered until 28 Feb 2026');
  });

  it('FE-PAGE-11 a rejected save keeps every value and focuses the summary', async () => {
    fetchMock.mockResolvedValue(
      json(400, {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          fields: { price: 'Must be 0 or more', purchaseDate: 'A purchase cannot be in the future' },
        },
      }),
    );
    const wrapper = form();

    await fill(wrapper, {
      productName: 'AirPods Pro (2nd generation)',
      seller: 'Amazon',
      price: '-1',
      purchaseDate: '2026-10-28',
    });
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    const summary = wrapper.get('[role="alert"]');
    expect(document.activeElement).toBe(summary.element);
    expect(summary.text()).toContain('Must be 0 or more');

    // Nothing retyped: losing a filled-in form is the fastest way to lose a user.
    expect((wrapper.get('#productName').element as HTMLInputElement).value).toBe(
      'AirPods Pro (2nd generation)',
    );
    expect((wrapper.get('#seller').element as HTMLInputElement).value).toBe('Amazon');
    expect(wrapper.get('#price').attributes('aria-invalid')).toBe('true');
    expect(wrapper.get('#purchaseDate').attributes('aria-invalid')).toBe('true');

    wrapper.unmount();
  });

  it('FE-PAGE-12 editing loads the purchase and saves only what changed', async () => {
    route.params = { purchaseId: 'p1' };
    fetchMock.mockResolvedValueOnce(
      json(200, {
        id: 'p1',
        productName: 'AirPods Pro (2nd generation)',
        category: 'ELECTRONICS',
        seller: 'Amazon',
        purchaseDate: '2026-10-27',
        price: 24900,
        currency: 'INR',
        returnWindowDays: 7,
        warrantyStartDate: '2026-10-27',
        warrantyMonths: 12,
        notes: null,
        returnDeadline: '2026-11-03',
        returnStatus: 'EXPIRING_SOON',
        returnDaysLeft: 7,
        warrantyExpiry: '2027-10-26',
        warrantyStatus: 'ACTIVE',
        warrantyDaysLeft: 364,
        hasReceipt: false,
        attachments: [],
        serviceRecords: [],
      }),
    );

    const wrapper = form();
    await flushPromises();

    expect((wrapper.get('#productName').element as HTMLInputElement).value).toBe(
      'AirPods Pro (2nd generation)',
    );
    expect((wrapper.get('#seller').element as HTMLInputElement).value).toBe('Amazon');

    fetchMock.mockResolvedValueOnce(json(200, { id: 'p1' }));
    await fill(wrapper, { seller: 'Croma' });
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(url).toBe('/api/v1/purchases/p1');
    expect(init.method).toBe('PATCH');
    expect(String(init.body)).toContain('Croma');

    wrapper.unmount();
  });
});
