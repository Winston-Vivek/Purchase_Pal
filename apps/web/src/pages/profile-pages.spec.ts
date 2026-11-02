import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ConfirmEmailPage from './ConfirmEmailPage.vue';
import ProfilePage from './ProfilePage.vue';
import { useAuthStore } from '../stores/auth';

const route = { query: {} as Record<string, string>, params: {} };
const push = vi.fn();

vi.mock('vue-router', async (original) => ({
  ...(await original<typeof import('vue-router')>()),
  useRouter: () => ({ push, replace: push }),
  useRoute: () => route,
}));

/** FE-PAGE-56..58 from docs/test-cases.md §4 — BR-15. */
describe('Profile and email confirmation', () => {
  const fetchMock = vi.fn();

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    push.mockReset();
    route.query = {};
    useAuthStore().user = {
      id: 'u1',
      name: 'Ada Lovelace',
      email: 'ada@test.dev',
      warrantyAlertDays: 30,
      returnAlertDays: 7,
      serviceAlertDays: 14,
      emailReminders: true,
    };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  const stubs = {
    AppShell: { template: '<div><slot /></div>' },
    RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
  };

  describe('FE-PAGE-56/57 the profile page', () => {
    const page = () => mount(ProfilePage, { global: { stubs } });

    it('FE-PAGE-56 saves the name and the sidebar follows without a reload', async () => {
      const wrapper = page();
      await wrapper.get('#name').setValue('Ada King');

      fetchMock.mockResolvedValueOnce(json(200, { id: 'u1', name: 'Ada King' }));
      await wrapper.get('[data-testid="name-form"]').trigger('submit');
      await flushPromises();

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/api/v1/users/me');
      expect(init.method).toBe('PATCH');
      expect(JSON.parse(String(init.body))).toEqual({ name: 'Ada King' });
      expect(useAuthStore().user?.name).toBe('Ada King');
    });

    it('FE-PAGE-57 asking for an email change says to check the NEW address', async () => {
      const wrapper = page();
      await wrapper.get('#email').setValue('ada.king@test.dev');
      await wrapper.get('#currentPassword').setValue('Passw0rd1');

      fetchMock.mockResolvedValueOnce(new Response(null, { status: 202 }));
      await wrapper.get('[data-testid="email-form"]').trigger('submit');
      await flushPromises();

      expect(JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body))).toEqual(
        { email: 'ada.king@test.dev', currentPassword: 'Passw0rd1' },
      );

      const pending = wrapper.get('[data-testid="email-pending"]').text();
      expect(pending).toContain('ada.king@test.dev');
      // It must not read as done: the address has NOT changed yet (BR-15).
      expect(pending).toMatch(/until then you keep signing in/i);
      expect(useAuthStore().user?.email).toBe('ada@test.dev');
      // And the password is not left sitting in the field.
      expect((wrapper.get('#currentPassword').element as HTMLInputElement).value).toBe('');
    });

    it('FE-PAGE-57 a refused address shows the reason on its field', async () => {
      const wrapper = page();
      await wrapper.get('#email').setValue('taken@test.dev');
      await wrapper.get('#currentPassword').setValue('Passw0rd1');

      fetchMock.mockResolvedValueOnce(
        json(409, {
          error: { code: 'CONFLICT', message: 'That email address is already registered' },
        }),
      );
      await wrapper.get('[data-testid="email-form"]').trigger('submit');
      await flushPromises();

      expect(wrapper.text()).toMatch(/already registered/i);
      expect(wrapper.find('[data-testid="email-pending"]').exists()).toBe(false);
    });
  });

  describe('FE-PAGE-58 confirming', () => {
    const page = () => mount(ConfirmEmailPage, { global: { stubs } });

    it('FE-PAGE-58 confirms on arrival, with no button to press', async () => {
      route.query = { token: 'abc123' };
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));

      const wrapper = page();
      await flushPromises();

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/api/v1/users/me/email/confirm');
      expect(JSON.parse(String(init.body))).toEqual({ token: 'abc123' });
      expect(wrapper.find('[data-testid="confirmed"]').exists()).toBe(true);
    });

    it('FE-PAGE-58 a spent link says so, in the words the server used', async () => {
      route.query = { token: 'stale' };
      fetchMock.mockResolvedValueOnce(
        json(400, {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'That confirmation link is no longer valid. Ask for a new one.',
          },
        }),
      );

      const wrapper = page();
      await flushPromises();

      expect(wrapper.get('[data-testid="confirm-failed"]').text()).toMatch(/no longer valid/i);
    });

    it('FE-PAGE-58 a link with no token sends nothing', async () => {
      route.query = {};

      const wrapper = page();
      await flushPromises();

      expect(fetchMock).not.toHaveBeenCalled();
      expect(wrapper.get('[data-testid="confirm-failed"]').text()).toMatch(/incomplete/i);
    });
  });
});
