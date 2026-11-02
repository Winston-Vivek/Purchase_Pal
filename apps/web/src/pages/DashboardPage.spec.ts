import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from './DashboardPage.vue';
import { useAuthStore } from '../stores/auth';

vi.mock('vue-router', async (original) => ({
  ...(await original<typeof import('vue-router')>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useRoute: () => ({ query: {}, params: {} }),
}));

const SUMMARY = {
  counts: { total: 7, underWarranty: 5, openReturns: 2, needsAction: 3, totalValue: 315372 },
  needsAction: [
    {
      purchaseId: 'p-nike',
      productName: 'Nike Pegasus 41',
      kind: 'RETURN',
      date: '2026-10-31',
      daysLeft: 4,
      hasReceipt: false,
    },
    {
      purchaseId: 'p-sam',
      productName: 'Samsung 1.5 Ton Inverter Split AC',
      kind: 'WARRANTY',
      date: '2026-11-01',
      daysLeft: 5,
      hasReceipt: true,
    },
    {
      purchaseId: 'p-air',
      productName: 'AirPods Pro (2nd generation)',
      kind: 'RETURN',
      date: '2026-11-03',
      daysLeft: 7,
      hasReceipt: true,
    },
  ],
  recentlyExpired: [
    {
      purchaseId: 'p-fry',
      productName: 'Philips Air Fryer',
      kind: 'RETURN',
      date: '2026-10-22',
      daysLeft: -5,
      hasReceipt: true,
    },
    {
      purchaseId: 'p-lg',
      productName: 'LG washing machine',
      kind: 'WARRANTY',
      date: '2026-10-19',
      daysLeft: -8,
      hasReceipt: true,
    },
  ],
  recentPurchases: [
    {
      id: 'p-air',
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
      hasReceipt: true,
    },
  ],
};

const EMPTY = {
  counts: { total: 0, underWarranty: 0, openReturns: 0, needsAction: 0, totalValue: 0 },
  needsAction: [],
  recentlyExpired: [],
  recentPurchases: [],
};

/** FE-PAGE-18..21 from docs/test-cases.md §4. */
describe('Dashboard', () => {
  const fetchMock = vi.fn();

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    useAuthStore().user = {
      id: 'u1',
      name: 'Winston',
      email: 'demo@proofly.test',
      warrantyAlertDays: 30,
      returnAlertDays: 7,
      serviceAlertDays: 14,
    };
  });

  afterEach(() => vi.unstubAllGlobals());

  const page = async (summary: unknown = SUMMARY) => {
    fetchMock.mockResolvedValueOnce(json(200, summary));
    const wrapper = mount(DashboardPage, {
      global: {
        stubs: {
          AppShell: { template: '<div><slot /></div>' },
          RouterLink: {
            props: ['to'],
            template: '<a :href="typeof to === \'string\' ? to : to.path"><slot /></a>',
          },
        },
      },
    });
    await flushPromises();
    return wrapper;
  };

  it('FE-PAGE-18 shows the four counts, including what it is all worth', async () => {
    const wrapper = await page();
    const text = wrapper.text();

    expect(text).toContain('7');
    expect(text).toContain('₹3,15,372.00');
    expect(text).toMatch(/under warranty/i);
    expect(text).toMatch(/returns open/i);
    expect(text).toMatch(/need action/i);
  });

  it('FE-PAGE-18 needs action keeps the order the API sent, soonest first', async () => {
    const wrapper = await page();
    const section = wrapper.get('[data-testid="needs-action"]');

    const names = section.findAll('li').map((li) => li.text());
    expect(names[0]).toContain('Nike Pegasus 41');
    expect(names[1]).toContain('Samsung');
    expect(names[2]).toContain('AirPods');
    // Re-sorting on the client would quietly disagree with API-DASH-02.
    expect(section.text()).toContain('Return closes in 4 days');
  });

  it('FE-PAGE-18 a needs-action row says which deadline it is', async () => {
    const wrapper = await page();
    const section = wrapper.get('[data-testid="needs-action"]');

    expect(section.text()).toContain('Warranty ends in 5 days');
    // BR-06: the Nike has no receipt, and the row says so.
    expect(section.text()).toContain('Receipt missing');
  });

  it('FE-PAGE-18 recently expired and recent purchases both appear', async () => {
    const wrapper = await page();

    const expired = wrapper.get('[data-testid="recently-expired"]').text();
    expect(expired).toContain('Philips Air Fryer');
    expect(expired).toContain('Return closed 22 Oct 2026');

    const recent = wrapper.get('[data-testid="recent-purchases"]').text();
    expect(recent).toContain('AirPods Pro (2nd generation)');
    expect(recent).toContain('₹24,900.00');
  });

  it('FE-PAGE-19 every deadline row links to its purchase', async () => {
    const wrapper = await page();

    const hrefs = wrapper
      .get('[data-testid="needs-action"]')
      .findAll('a')
      .map((a) => a.attributes('href'));

    expect(hrefs).toContain('/purchases/p-nike');
    expect(hrefs).toContain('/purchases/p-sam');
  });

  it('FE-PAGE-20 a new user is invited to start, not shown four zeroes', async () => {
    const wrapper = await page(EMPTY);

    expect(wrapper.text()).toMatch(/add your first purchase/i);
    expect(wrapper.find('[data-testid="needs-action"]').exists()).toBe(false);
  });

  it('FE-PAGE-21 each count opens the list already filtered to match it', async () => {
    const wrapper = await page();

    const hrefs = wrapper
      .get('[data-testid="counts"]')
      .findAll('a')
      .map((a) => a.attributes('href'));

    expect(hrefs).toContain('/purchases');
    // "Under warranty" is ACTIVE or EXPIRING_SOON — a card saying 5 must not
    // link to a list of 4.
    expect(hrefs).toContain('/purchases?warrantyStatus=ACTIVE,EXPIRING_SOON');
    expect(hrefs).toContain('/purchases?returnStatus=ACTIVE,EXPIRING_SOON');
  });

  it('FE-PAGE-18 the last day reads as "today", never "in 0 days"', async () => {
    const wrapper = await page({
      ...SUMMARY,
      needsAction: [{ ...SUMMARY.needsAction[0], daysLeft: 0, date: '2026-10-29' }],
      counts: { ...SUMMARY.counts, needsAction: 1 },
    });

    // ui-guide §3 gives the last day its own wording. The badge already does
    // this; the count card has to agree with it.
    const counts = wrapper.get('[data-testid="counts"]').text();
    expect(counts).toMatch(/soonest closes today/i);
    expect(counts).not.toMatch(/in 0 days/i);
  });

  it('shows a skeleton while loading rather than four zeroes', async () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    const wrapper = mount(DashboardPage, {
      global: {
        stubs: {
          AppShell: { template: '<div><slot /></div>' },
          RouterLink: { template: '<a href="#"><slot /></a>' },
        },
      },
    });
    await flushPromises();

    expect(wrapper.find('[aria-busy="true"]').exists()).toBe(true);
    expect(wrapper.text()).not.toMatch(/add your first purchase/i);
  });
});
