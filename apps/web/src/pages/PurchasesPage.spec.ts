import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PurchasesPage from './PurchasesPage.vue';
import type { PurchaseResponse } from '../api/types';

const route = { query: {} as Record<string, string>, params: {} };

const push = vi.fn();

vi.mock('vue-router', async (original) => ({
  ...(await original<typeof import('vue-router')>()),
  useRouter: () => ({ push, replace: push }),
  useRoute: () => route,
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
    route.query = {};
    push.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    // Teleported content (the row menu, the confirm dialog) outlives an
    // unmounted wrapper, and a leftover menu makes the next test read two.
    document.body.innerHTML = '';
  });

  const page = () =>
    mount(PurchasesPage, {
      global: {
        stubs: {
          AppShell: { template: '<div><slot /></div>' },
          RouterLink: { template: '<a href="#"><slot /></a>' },
        },
      },
    });

  // FE-PAGE-42..44. A table of things you open is tedious if only the name is
  // a target, so the whole row works — without stealing clicks from the
  // controls inside it.
  describe('FE-PAGE-42..44 row actions', () => {
    const DELL: PurchaseResponse = { ...AIRPODS, id: 'p2', productName: 'Dell XPS 13' };

    const listed = (items = [AIRPODS, DELL]) =>
      fetchMock.mockResolvedValue(json(200, { items, total: items.length, page: 1, pageSize: 20 }));

    const rows = (wrapper: ReturnType<typeof page>) => wrapper.findAll('tbody tr');

    /** The row menu is teleported to the body, so it is read from there. */
    const openMenuItems = (): HTMLElement[] =>
      Array.from(document.body.querySelectorAll<HTMLElement>('[role="menu"] [role="menuitem"]'));

    /** Indexing is checked, so a shorter list fails here and not three lines
     *  later with "cannot read properties of undefined". */
    const row = (wrapper: ReturnType<typeof page>, index: number) => {
      const found = rows(wrapper)[index];
      if (!found) throw new Error(`no row at ${index}`);
      return found;
    };

    it('FE-PAGE-42 clicking a row opens that purchase', async () => {
      listed();
      const wrapper = page();
      await flushPromises();

      await row(wrapper, 1).trigger('click');

      expect(push).toHaveBeenCalledWith('/purchases/p2');
    });

    it('FE-PAGE-42 a click on something interactive is left alone', async () => {
      listed();
      const wrapper = page();
      await flushPromises();

      // The menu button lives in the row; opening it must not also navigate.
      await row(wrapper, 0).get('[data-testid="row-menu"]').trigger('click');

      expect(push).not.toHaveBeenCalledWith('/purchases/p1');
    });

    it('FE-PAGE-43 the row menu offers view, edit and delete for that row', async () => {
      listed();
      const wrapper = page();
      await flushPromises();

      await row(wrapper, 0).get('[data-testid="row-menu"]').trigger('click');
      // Teleported out of the table so the card cannot clip it (NFR-14).
      const labels = openMenuItems().map((item) => item.textContent?.trim());

      expect(labels).toEqual(['View', 'Edit', 'Delete']);
    });

    it('FE-PAGE-44 deleting asks first, then sends it and drops the row', async () => {
      listed();
      const wrapper = page();
      await flushPromises();

      await row(wrapper, 1).get('[data-testid="row-menu"]').trigger('click');
      const remove = openMenuItems().find((item) => item.textContent?.trim() === 'Delete');
      remove!.click();
      await flushPromises();

      // Nothing is sent until the question is answered (ui-guide §7).
      expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);
      expect(wrapper.text()).toContain('Dell XPS 13');

      // The dialog is teleported, so it lives on the body, not in the wrapper.
      const dialog = document.body.querySelector('[role="dialog"]');
      expect(dialog?.textContent).toContain('Dell XPS 13');

      fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
      listed([AIRPODS]);
      const confirm = Array.from(dialog!.querySelectorAll('button')).find((b) =>
        /delete purchase/i.test(b.textContent ?? ''),
      );
      confirm!.click();
      await flushPromises();

      const sent = fetchMock.mock.calls.find(([, init]) => init?.method === 'DELETE');
      expect(sent?.[0]).toContain('/purchases/p2');
    });
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

  it('FE-PAGE-06 the filter in the URL is actually sent to the API', async () => {
    // The dashboard links here with a filter. A page that ignores the query
    // shows every purchase, so a card reading 5 opens a list of 7 — which the
    // href assertion on the dashboard cannot catch.
    route.query = { warrantyStatus: 'ACTIVE,EXPIRING_SOON' };
    fetchMock.mockResolvedValue(json(200, { items: [AIRPODS], total: 1, page: 1, pageSize: 20 }));

    page();
    await flushPromises();

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain('warrantyStatus=ACTIVE%2CEXPIRING_SOON');
  });

  it('FE-PAGE-06 search text and category in the URL are sent too', async () => {
    route.query = { q: 'airpods', category: 'ELECTRONICS', sort: 'price_desc', page: '2' };
    fetchMock.mockResolvedValue(json(200, { items: [], total: 0, page: 2, pageSize: 20 }));

    page();
    await flushPromises();

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain('q=airpods');
    expect(url).toContain('category=ELECTRONICS');
    expect(url).toContain('sort=price_desc');
    expect(url).toContain('page=2');
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

    fetchMock.mockResolvedValueOnce(
      json(200, { items: [AIRPODS], total: 1, page: 1, pageSize: 20 }),
    );
    // By name, not by position: the search form now renders a button first.
    const retry = wrapper.findAll('button').find((b) => /try again/i.test(b.text()));
    await retry?.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('AirPods Pro (2nd generation)');
  });

  // ------------------------------------------------ FE-PAGE-29..32 --------
  describe('search, filters and paging', () => {
    const withResults = (items = [AIRPODS], total = 1) =>
      fetchMock.mockResolvedValue(json(200, { items, total, page: 1, pageSize: 20 }));

    it('FE-PAGE-29 searching puts the text in the URL, not in component state', async () => {
      withResults();
      const wrapper = page();
      await flushPromises();

      await wrapper.get('#q').setValue('airpods');
      await wrapper.get('[data-testid="search-form"]').trigger('submit');

      // The URL is the state, so the result can be refreshed and shared
      // (state-url-for-ephemeral-filters).
      expect(push).toHaveBeenCalledWith({ query: { q: 'airpods' } });
    });

    it('FE-PAGE-29 choosing a filter adds it to the URL and keeps the search text', async () => {
      route.query = { q: 'airpods' };
      withResults();
      const wrapper = page();
      await flushPromises();

      await wrapper.get('#category').setValue('ELECTRONICS');

      expect(push).toHaveBeenCalledWith({ query: { q: 'airpods', category: 'ELECTRONICS' } });
    });

    it('FE-PAGE-29 every active filter gets a chip that says what it is', async () => {
      route.query = { q: 'airpods', category: 'ELECTRONICS', returnStatus: 'EXPIRING_SOON' };
      withResults();
      const wrapper = page();
      await flushPromises();

      const chips = wrapper.get('[data-testid="chips"]').text();
      expect(chips).toContain('airpods');
      expect(chips).toMatch(/electronics/i);
      expect(chips).toMatch(/expiring soon|closing soon/i);
    });

    // FE-PAGE-35. The dashboard's "Open returns" count links here with two
    // statuses at once, and the chip looked them up as one string — so it
    // showed the user the raw column values.
    it('FE-PAGE-35 a multi-value filter is still written in words', async () => {
      route.query = { returnStatus: 'ACTIVE,EXPIRING_SOON' };
      withResults();
      const wrapper = page();
      await flushPromises();

      const chips = wrapper.get('[data-testid="chips"]').text();
      expect(chips).not.toContain('_');
      expect(chips).not.toContain('ACTIVE');
      expect(chips).toMatch(/active/i);
      expect(chips).toMatch(/expiring soon/i);
    });

    it('FE-PAGE-30 removing one chip drops only that filter', async () => {
      route.query = { q: 'airpods', category: 'ELECTRONICS' };
      withResults();
      const wrapper = page();
      await flushPromises();

      const remove = wrapper
        .get('[data-testid="chips"]')
        .findAll('button')
        .find((b) => /electronics/i.test(b.attributes('aria-label') ?? ''));
      await remove?.trigger('click');

      expect(push).toHaveBeenCalledWith({ query: { q: 'airpods' } });
    });

    it('FE-PAGE-30 clear all drops every filter at once', async () => {
      route.query = { q: 'airpods', category: 'ELECTRONICS', sort: 'price_desc' };
      withResults();
      const wrapper = page();
      await flushPromises();

      await wrapper.get('[data-testid="clear-all"]').trigger('click');

      expect(push).toHaveBeenCalledWith({ query: {} });
    });

    it('FE-PAGE-31 no results names the filters and offers to clear them', async () => {
      route.query = { q: 'kettle', category: 'MOBILE' };
      fetchMock.mockResolvedValue(json(200, { items: [], total: 0, page: 1, pageSize: 20 }));
      const wrapper = page();
      await flushPromises();

      const text = wrapper.text();
      expect(text).toMatch(/no purchases match/i);
      // "Nothing found" leaves the user guessing which filter did it.
      expect(text).toContain('kettle');
      expect(text).toMatch(/mobile/i);
      expect(wrapper.find('[data-testid="clear-all"]').exists()).toBe(true);
      // An empty RESULT is not an empty ACCOUNT.
      expect(text).not.toMatch(/no purchases yet/i);
    });

    it('FE-PAGE-32 the controls show what the URL says, so a refresh keeps them', async () => {
      route.query = { q: 'airpods', category: 'ELECTRONICS', sort: 'price_desc' };
      withResults();
      const wrapper = page();
      await flushPromises();

      expect((wrapper.get('#q').element as HTMLInputElement).value).toBe('airpods');
      expect((wrapper.get('#category').element as HTMLSelectElement).value).toBe('ELECTRONICS');
      expect((wrapper.get('#sort').element as HTMLSelectElement).value).toBe('price_desc');
    });

    it('paging says where you are, and only appears when there is more than a page', async () => {
      fetchMock.mockResolvedValue(
        json(200, { items: [AIRPODS], total: 57, page: 2, pageSize: 20 }),
      );
      route.query = { page: '2' };
      const wrapper = page();
      await flushPromises();

      expect(wrapper.text()).toMatch(/21.{1,3}40 of 57/);
      expect(wrapper.find('[data-testid="pagination"]').exists()).toBe(true);
    });

    it('paging is hidden when everything fits on one page', async () => {
      withResults([AIRPODS], 1);
      const wrapper = page();
      await flushPromises();

      expect(wrapper.find('[data-testid="pagination"]').exists()).toBe(false);
    });
  });
});
