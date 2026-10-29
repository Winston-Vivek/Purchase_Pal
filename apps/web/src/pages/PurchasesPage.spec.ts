import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PurchasesPage from './PurchasesPage.vue';
import type { PurchaseResponse } from '../api/types';

vi.mock('vue-router', async (original) => ({
  ...(await original<typeof import('vue-router')>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useRoute: () => ({ query: {}, params: {} }),
}));

const AIRPODS: PurchaseResponse = {
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
};

/** FE-PAGE-05..08 from docs/test-cases.md §4. */
describe('My purchases', () => {
  const fetchMock = vi.fn();

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => vi.unstubAllGlobals());

  const page = () =>
    mount(PurchasesPage, {
      global: {
        stubs: {
          AppShell: { template: '<div><slot /></div>' },
          RouterLink: { template: '<a href="#"><slot /></a>' },
        },
      },
    });

  it('FE-PAGE-05 shows a skeleton while it loads, not an empty screen', async () => {
    // Never resolves, so the component stays in its loading state.
    fetchMock.mockReturnValue(new Promise(() => {}));

    const wrapper = page();
    await flushPromises();

    expect(wrapper.find('[aria-busy="true"]').exists()).toBe(true);
    // An empty state here would tell the user they own nothing, which is a lie.
    expect(wrapper.text()).not.toMatch(/no purchases yet/i);
  });

  it('FE-PAGE-06 a row carries the facts and both deadline badges', async () => {
    fetchMock.mockResolvedValue(json(200, { items: [AIRPODS], total: 1, page: 1, pageSize: 20 }));

    const wrapper = page();
    await flushPromises();

    const text = wrapper.text();
    expect(text).toContain('AirPods Pro (2nd generation)');
    expect(text).toContain('27 Oct 2026');
    expect(text).toContain('₹24,900.00');
    expect(text).toContain('Return closes in 7 days');
    expect(text).toContain('Covered · 364 days left');
    // BR-06: a purchase with no receipt says so.
    expect(text).toContain('Receipt missing');
  });

  it('FE-PAGE-06 a purchase with a receipt does not claim one is missing', async () => {
    fetchMock.mockResolvedValue(
      json(200, { items: [{ ...AIRPODS, hasReceipt: true }], total: 1, page: 1, pageSize: 20 }),
    );

    const wrapper = page();
    await flushPromises();

    expect(wrapper.text()).not.toContain('Receipt missing');
  });

  it('FE-PAGE-06 the whole row links to the purchase', async () => {
    fetchMock.mockResolvedValue(json(200, { items: [AIRPODS], total: 1, page: 1, pageSize: 20 }));

    const wrapper = page();
    await flushPromises();

    expect(wrapper.html()).toContain('/purchases/p1');
  });

  it('FE-PAGE-07 an empty list explains itself and offers the next step', async () => {
    fetchMock.mockResolvedValue(json(200, { items: [], total: 0, page: 1, pageSize: 20 }));

    const wrapper = page();
    await flushPromises();

    expect(wrapper.text()).toMatch(/no purchases yet/i);
    expect(wrapper.text()).toMatch(/add/i);
  });

  it('FE-PAGE-08 a failed load says so and offers to try again', async () => {
    fetchMock.mockResolvedValue(
      json(500, { error: { code: 'INTERNAL', message: 'Something went wrong' } }),
    );

    const wrapper = page();
    await flushPromises();

    expect(wrapper.text()).toMatch(/try again/i);
    // An error is not an empty list; saying "no purchases yet" would be wrong.
    expect(wrapper.text()).not.toMatch(/no purchases yet/i);
  });

  it('FE-PAGE-08 trying again actually re-requests', async () => {
    fetchMock.mockResolvedValueOnce(
      json(500, { error: { code: 'INTERNAL', message: 'Something went wrong' } }),
    );
    const wrapper = page();
    await flushPromises();

    fetchMock.mockResolvedValueOnce(json(200, { items: [AIRPODS], total: 1, page: 1, pageSize: 20 }));
    await wrapper.get('button').trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('AirPods Pro (2nd generation)');
  });
});
