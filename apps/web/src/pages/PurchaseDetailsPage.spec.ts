import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FileDrop from '../components/FileDrop.vue';
import PurchaseDetailsPage from './PurchaseDetailsPage.vue';

const push = vi.fn();
const route = { params: { purchaseId: 'p1' } as Record<string, string>, query: {} };

vi.mock('vue-router', async (original) => ({
  ...(await original<typeof import('vue-router')>()),
  useRouter: () => ({ push, replace: push }),
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
    push.mockReset();
    route.params = { purchaseId: 'p1' };
  });

  afterEach(() => vi.unstubAllGlobals());

  const page = async (purchase: unknown = SAMSUNG) => {
    fetchMock.mockResolvedValueOnce(json(200, purchase));
    const wrapper = mount(PurchaseDetailsPage, {
      global: {
        stubs: {
          AppShell: { template: '<div><slot /></div>' },
          RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
        },
      },
    });
    await flushPromises();
    return wrapper;
  };

  // FE-PAGE-45. BR-12: the field that turns a service log into a reminder.
  describe('FE-PAGE-45 scheduling the next service', () => {
    const DUE = {
      ...SAMSUNG,
      nextServiceDate: '2026-11-15',
      serviceStatus: 'EXPIRING_SOON',
      serviceDaysLeft: 4,
      serviceRecords: [
        {
          id: 's1',
          purchaseId: 'p1',
          serviceDate: '2026-05-15',
          nextServiceDate: '2026-11-15',
          description: 'Annual service',
          provider: 'Croma',
          cost: 1200,
          notes: null,
        },
      ],
    };

    it('FE-PAGE-45 the panel shows when the next service is due', async () => {
      const wrapper = await page(DUE);

      const panel = wrapper.get('[data-testid="service-panel"]').text();
      expect(panel).toContain('15 Nov 2026');
      expect(panel).toContain('Service due in 4 days');
      // And it says which visit scheduled it, so the date is not a mystery.
      expect(panel).toContain('15 May 2026');
    });

    it('FE-PAGE-47 a date set at purchase says where it came from', async () => {
      const wrapper = await page({
        ...SAMSUNG,
        scheduledServiceDate: '2026-11-15',
        nextServiceDate: '2026-11-15',
        serviceStatus: 'EXPIRING_SOON',
        serviceDaysLeft: 4,
        serviceRecords: [],
      });

      const panel = wrapper.get('[data-testid="service-panel"]').text();
      expect(panel).toContain('Scheduled when this purchase was added');
      // An em dash where a date should be is what this replaced.
      expect(panel).not.toContain('Set on the service of');
    });

    it('FE-PAGE-45 nothing scheduled says so, rather than showing an empty date', async () => {
      const wrapper = await page({ ...SAMSUNG, nextServiceDate: null, serviceStatus: 'NOT_SET' });

      expect(wrapper.get('[data-testid="service-panel"]').text()).toContain(
        'No service is scheduled',
      );
    });
  });

  // FE-PAGE-34. vue-router records the path you came from in history state.
  // The back link was hard-coded to the list, so arriving from the Dashboard
  // and pressing back dropped you somewhere you had never been.
  describe('FE-PAGE-34 the way back', () => {
    const arriveFrom = (back: string | null) =>
      window.history.replaceState(back === null ? {} : { back }, '');

    afterEach(() => window.history.replaceState({}, ''));

    it('returns to the Dashboard when that is where you came from', async () => {
      arriveFrom('/dashboard');
      const wrapper = await page();

      const link = wrapper.findAll('a').find((a) => a.text().includes('Dashboard'));
      expect(link?.attributes('href')).toBe('/dashboard');
    });

    it('falls back to My purchases on a direct load', async () => {
      arriveFrom(null);
      const wrapper = await page();

      const link = wrapper.findAll('a').find((a) => a.text().includes('My purchases'));
      expect(link?.attributes('href')).toBe('/purchases');
    });

    it('falls back to My purchases when you came from anywhere else', async () => {
      arriveFrom('/purchases/p1/edit');
      const wrapper = await page();

      const link = wrapper.findAll('a').find((a) => a.text().includes('My purchases'));
      expect(link?.attributes('href')).toBe('/purchases');
    });
  });

  // FE-PAGE-38/39. BR-11: a user who has decided to keep the item needs a way
  // to stop Proofly counting the return as open.
  describe('FE-PAGE-38/39 closing a return by hand', () => {
    const OPEN_RETURN = {
      ...SAMSUNG,
      returnDeadline: '2026-11-05',
      returnStatus: 'EXPIRING_SOON',
      returnDaysLeft: 3,
    };

    it('FE-PAGE-38 "Keeping it" closes the return', async () => {
      const wrapper = await page(OPEN_RETURN);

      fetchMock.mockResolvedValueOnce(
        json(200, { ...OPEN_RETURN, returnStatus: 'CLOSED', returnDaysLeft: null }),
      );
      const button = wrapper.findAll('button').find((b) => /keeping it/i.test(b.text()));
      expect(button).toBeDefined();
      await button!.trigger('click');
      await flushPromises();

      const [url, init] = fetchMock.mock.calls.at(-1)!;
      expect(url).toContain('/purchases/p1');
      expect(init.method).toBe('PATCH');
      expect(JSON.parse(init.body)).toEqual({ returnClosed: true });
      expect(wrapper.text()).toContain('Keeping it');
    });

    it('FE-PAGE-39 a closed return offers to reopen, and does', async () => {
      const wrapper = await page({
        ...OPEN_RETURN,
        returnStatus: 'CLOSED',
        returnDaysLeft: null,
      });

      fetchMock.mockResolvedValueOnce(json(200, OPEN_RETURN));
      const button = wrapper.findAll('button').find((b) => /reopen/i.test(b.text()));
      expect(button).toBeDefined();
      await button!.trigger('click');
      await flushPromises();

      const [, init] = fetchMock.mock.calls.at(-1)!;
      expect(JSON.parse(init.body)).toEqual({ returnClosed: false });
      expect(wrapper.text()).toContain('Return closes in 3 days');
    });

    it('FE-PAGE-38 a purchase with no return window is not offered the button', async () => {
      const wrapper = await page(SAMSUNG);

      expect(wrapper.findAll('button').find((b) => /keeping it/i.test(b.text()))).toBeUndefined();
    });
  });

  // FE-PAGE-37. The header printed the stored value, so a kitchen purchase
  // announced itself as HOME_KITCHEN.
  it('FE-PAGE-37 the category reads as the words the form offered', async () => {
    const wrapper = await page({ ...SAMSUNG, category: 'HOME_KITCHEN' });

    expect(wrapper.text()).toContain('Home & kitchen');
    expect(wrapper.text()).not.toContain('HOME_KITCHEN');
  });

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
          RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
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

  describe('service history and destructive actions', () => {
    const WITH_SERVICE = {
      ...SAMSUNG,
      serviceRecords: [
        {
          id: 's1',
          purchaseId: 'p1',
          serviceDate: '2026-03-04',
          description: 'Free installation check',
          provider: 'Croma install team',
          cost: 0,
          notes: null,
        },
      ],
    };

    const clickButton = async (wrapper: ReturnType<typeof mount>, label: RegExp) => {
      const target = [
        ...document.body.querySelectorAll('button'),
        ...wrapper.findAll('button').map((b) => b.element),
      ].find((b) => label.test(b.textContent ?? ''));
      target?.click();
      await flushPromises();
      return target;
    };

    it('FE-PAGE-22 a new record is added and appears at the top of the history', async () => {
      const wrapper = await page(WITH_SERVICE);

      await clickButton(wrapper, /add service record/i);
      expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();

      fetchMock.mockResolvedValueOnce(
        json(201, {
          id: 's2',
          purchaseId: 'p1',
          serviceDate: '2026-06-15',
          description: 'Gas top-up and coil cleaning',
          provider: 'Samsung authorised service',
          cost: 2450,
          notes: null,
        }),
      );

      wrapper.findComponent({ name: 'ServiceDialog' }).vm.$emit('submit', {
        serviceDate: '2026-06-15',
        description: 'Gas top-up and coil cleaning',
        provider: 'Samsung authorised service',
        cost: 2450,
      });
      await flushPromises();

      const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit];
      expect(url).toBe('/api/v1/purchases/p1/services');
      expect(init.method).toBe('POST');

      // Newest first, matching the order the API lists them in (API-SVC-02).
      const items = wrapper.get('[data-testid="service-history"]').findAll('li');
      expect(items[0]?.text()).toContain('Gas top-up and coil cleaning');
      expect(items[1]?.text()).toContain('Free installation check');
      // And the dialog is gone once it worked.
      expect(document.body.querySelector('[role="dialog"]')).toBeNull();

      wrapper.unmount();
    });

    it('FE-PAGE-23 a rejected record keeps the dialog open with the error on its field', async () => {
      const wrapper = await page(WITH_SERVICE);
      await clickButton(wrapper, /add service record/i);

      fetchMock.mockResolvedValueOnce(
        json(400, {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            fields: { serviceDate: 'A service cannot be in the future' },
          },
        }),
      );

      wrapper.findComponent({ name: 'ServiceDialog' }).vm.$emit('submit', {
        serviceDate: '2027-01-01',
        description: 'Too early',
      });
      await flushPromises();

      expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
      expect(document.body.textContent).toContain('A service cannot be in the future');
      // Nothing was added to the history.
      expect(wrapper.get('[data-testid="service-history"]').findAll('li')).toHaveLength(1);

      wrapper.unmount();
    });

    it('FE-PAGE-24 deleting the purchase asks first, then goes back to the list', async () => {
      const wrapper = await page(WITH_SERVICE);

      await clickButton(wrapper, /delete purchase/i);

      const dialog = document.body.querySelector('[role="dialog"]');
      // ui-guide §7: name the thing and what goes with it.
      expect(dialog?.textContent).toContain('Samsung 1.5 Ton Inverter Split AC');
      expect(dialog?.textContent).toMatch(/1 service record/i);

      fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
      await clickButton(wrapper, /^delete$/i);

      const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit];
      expect(url).toBe('/api/v1/purchases/p1');
      expect(init.method).toBe('DELETE');
      expect(push).toHaveBeenCalledWith('/purchases');

      wrapper.unmount();
    });

    it('FE-PAGE-25 cancelling the delete sends nothing', async () => {
      const wrapper = await page(WITH_SERVICE);

      await clickButton(wrapper, /delete purchase/i);
      await clickButton(wrapper, /cancel/i);

      // Only the original GET.
      expect(fetchMock.mock.calls).toHaveLength(1);
      expect(push).not.toHaveBeenCalled();
      expect(document.body.querySelector('[role="dialog"]')).toBeNull();

      wrapper.unmount();
    });

    it('deleting a receipt asks first, and removes it from the list', async () => {
      const wrapper = await page({
        ...SAMSUNG,
        hasReceipt: true,
        attachments: [
          {
            id: 'a1',
            fileName: 'invoice.pdf',
            mimeType: 'application/pdf',
            fileSize: 1024,
            uploadedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      });

      await clickButton(wrapper, /delete receipt|remove invoice\.pdf/i);
      expect(document.body.querySelector('[role="dialog"]')?.textContent).toContain('invoice.pdf');

      fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
      await clickButton(wrapper, /^delete$/i);

      const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit];
      expect(url).toBe('/api/v1/attachments/a1');
      expect(init.method).toBe('DELETE');
      expect(wrapper.text()).not.toContain('invoice.pdf');
      expect(wrapper.text()).toMatch(/0 of 5/);
      // BR-06 again: with no receipts the banner comes back.
      expect(wrapper.text()).toContain('Receipt missing');

      wrapper.unmount();
    });
  });
});
