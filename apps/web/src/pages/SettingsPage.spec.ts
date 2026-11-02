import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SettingsPage from './SettingsPage.vue';
import { useAuthStore } from '../stores/auth';

const push = vi.fn();

vi.mock('vue-router', async (original) => ({
  ...(await original<typeof import('vue-router')>()),
  useRouter: () => ({ push, replace: push }),
  useRoute: () => ({ query: {}, params: {} }),
}));

/** FE-PAGE-26..28 from docs/test-cases.md §4 — US-08. */
describe('Settings', () => {
  const fetchMock = vi.fn();

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    push.mockReset();
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

  const page = () =>
    mount(SettingsPage, {
      global: {
        stubs: {
          AppShell: { template: '<div><slot /></div>' },
          RouterLink: { template: '<a href="#"><slot /></a>' },
        },
      },
    });

  // FE-PAGE-36. A window of 1 is a perfectly ordinary setting, and the
  // sentence that explains the whole screen read "1 days".
  it('FE-PAGE-36 a window of one day reads as one day', async () => {
    const wrapper = page();

    await wrapper.get('#returnAlertDays').setValue('1');

    const sentence = wrapper.text();
    expect(sentence).toContain('1 day before a return window closes');
    expect(sentence).not.toContain('1 days');
  });

  // FE-PAGE-46. BR-12's third deadline needs its own window, or a yearly
  // service would nag on a return's schedule.
  it('FE-PAGE-46 the service window is shown and saved with the others', async () => {
    const wrapper = page();

    expect((wrapper.get('#serviceAlertDays').element as HTMLInputElement).value).toBe('14');

    await wrapper.get('#serviceAlertDays').setValue('21');
    expect(wrapper.text()).toContain('21 days before a service is due');

    fetchMock.mockResolvedValueOnce(
      json(200, { warrantyAlertDays: 30, returnAlertDays: 7, serviceAlertDays: 21 }),
    );
    await wrapper.get('[data-testid="settings-form"]').trigger('submit');
    await flushPromises();

    const [, init] = fetchMock.mock.calls.at(-1)!;
    expect(JSON.parse(init.body)).toMatchObject({ serviceAlertDays: 21 });
  });

  it('FE-PAGE-26 starts from the windows the account already has', () => {
    const wrapper = page();

    expect((wrapper.get('#warrantyAlertDays').element as HTMLInputElement).value).toBe('30');
    expect((wrapper.get('#returnAlertDays').element as HTMLInputElement).value).toBe('7');
  });

  it('FE-PAGE-26 the preview sentence changes as you type, before saving', async () => {
    const wrapper = page();
    expect(wrapper.text()).toMatch(/7 days before a return/i);

    await wrapper.get('#returnAlertDays').setValue('3');

    // The sentence is the point: a number in a box does not tell anyone what
    // it will do (ui-guide §6 S7).
    expect(wrapper.text()).toMatch(/3 days before a return/i);
    expect(wrapper.text()).not.toMatch(/7 days before a return/i);
    // Nothing is saved until Save is pressed.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('FE-PAGE-26 saving sends only the windows, and says it worked', async () => {
    fetchMock.mockResolvedValue(
      json(200, { warrantyAlertDays: 60, returnAlertDays: 3, serviceAlertDays: 14 }),
    );
    const wrapper = page();

    await wrapper.get('#warrantyAlertDays').setValue('60');
    await wrapper.get('#returnAlertDays').setValue('3');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/v1/users/me/settings');
    expect(init.method).toBe('PATCH');
    // All three windows, because the form owns all three (BR-12).
    expect(JSON.parse(String(init.body))).toEqual({
      warrantyAlertDays: 60,
      returnAlertDays: 3,
      serviceAlertDays: 14,
    });

    expect(wrapper.get('[role="status"]').text()).toMatch(/saved/i);
    // US-08: the store is updated too, so the dashboard uses the new windows
    // without a reload.
    expect(useAuthStore().user?.returnAlertDays).toBe(3);
  });

  it('FE-PAGE-27 a window outside its range is refused before anything is sent', async () => {
    const wrapper = page();

    await wrapper.get('#returnAlertDays').setValue('0');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(wrapper.get('#returnAlertDays').attributes('aria-invalid')).toBe('true');
    expect(wrapper.text()).toMatch(/between 1 and 60/i);
    // Save is blocked: a request that is certain to 400 is a wasted round trip
    // and a worse message.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('FE-PAGE-27 the warranty window has its own range', async () => {
    const wrapper = page();

    await wrapper.get('#warrantyAlertDays').setValue('400');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toMatch(/between 1 and 365/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('FE-PAGE-28 signing out clears the session and goes to sign in', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    const wrapper = page();

    await wrapper.get('[data-testid="sign-out"]').trigger('click');
    await flushPromises();

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/auth/logout');
    expect(useAuthStore().user).toBeNull();
    expect(push).toHaveBeenCalledWith('/login');
  });

  it('shows which account is signed in', () => {
    const wrapper = page();

    expect(wrapper.text()).toContain('Winston');
    expect(wrapper.text()).toContain('demo@proofly.test');
  });
});
