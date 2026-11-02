import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ForgotPasswordPage from './ForgotPasswordPage.vue';
import ResetPasswordPage from './ResetPasswordPage.vue';

const push = vi.fn();
const route = { query: {} as Record<string, string>, params: {} };

vi.mock('vue-router', async (original) => ({
  ...(await original<typeof import('vue-router')>()),
  useRouter: () => ({ push, replace: push }),
  useRoute: () => route,
}));

/** FE-PAGE-48..50 from docs/test-cases.md §4 — BR-14. */
describe('Forgot and reset password', () => {
  const fetchMock = vi.fn();

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    push.mockReset();
    route.query = {};
  });

  afterEach(() => vi.unstubAllGlobals());

  const stubs = { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } };

  describe('FE-PAGE-48 asking for a link', () => {
    const page = () => mount(ForgotPasswordPage, { global: { stubs } });

    it('FE-PAGE-48 sends the address and confirms, without promising an account exists', async () => {
      const wrapper = page();
      await wrapper.get('#email').setValue('ada@test.dev');

      fetchMock.mockResolvedValueOnce(new Response(null, { status: 202 }));
      await wrapper.get('form').trigger('submit');
      await flushPromises();

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/api/v1/auth/forgot-password');
      expect(init.method).toBe('POST');
      expect(JSON.parse(String(init.body))).toEqual({ email: 'ada@test.dev' });

      // "If ... has an account" — never "we have emailed you".
      const confirmation = wrapper.get('[data-testid="sent"]').text();
      expect(confirmation).toMatch(/if .*has an account/i);
    });

    it('FE-PAGE-48 says exactly the same thing when the request fails', async () => {
      const wrapper = page();
      await wrapper.get('#email').setValue('nobody@test.dev');

      // A visible failure here would hint that this address was different.
      fetchMock.mockRejectedValueOnce(new Error('network'));
      await wrapper.get('form').trigger('submit');
      await flushPromises();

      expect(wrapper.find('[data-testid="sent"]').exists()).toBe(true);
      expect(wrapper.text()).not.toMatch(/error|failed|not found/i);
    });

    it('FE-PAGE-48 sends nothing for an empty address', async () => {
      const wrapper = page();

      await wrapper.get('form').trigger('submit');
      await flushPromises();

      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('FE-PAGE-49/50 setting the new password', () => {
    const page = () => mount(ResetPasswordPage, { global: { stubs } });

    it('FE-PAGE-49 sends the token with the password and ends at sign in', async () => {
      route.query = { token: 'abc123' };
      const wrapper = page();

      await wrapper.get('#password').setValue('N3wPassw0rd');
      await wrapper.get('#confirmation').setValue('N3wPassw0rd');

      fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));
      await wrapper.get('form').trigger('submit');
      await flushPromises();

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/api/v1/auth/reset-password');
      expect(JSON.parse(String(init.body))).toEqual({
        token: 'abc123',
        password: 'N3wPassw0rd',
      });
      // No session comes from a reset, so the journey ends at sign in.
      expect(push).toHaveBeenCalledWith({ path: '/login', query: { reset: '1' } });
    });

    it('FE-PAGE-50 a mismatch is caught here, before anything is sent', async () => {
      route.query = { token: 'abc123' };
      const wrapper = page();

      await wrapper.get('#password').setValue('N3wPassw0rd');
      await wrapper.get('#confirmation').setValue('N3wPassw0rdd');
      await wrapper.get('form').trigger('submit');
      await flushPromises();

      expect(fetchMock).not.toHaveBeenCalled();
      expect(wrapper.text()).toMatch(/do not match/i);
    });

    it('FE-PAGE-50 a link with no token says so instead of offering a dead form', async () => {
      route.query = {};
      const wrapper = page();

      expect(wrapper.find('[data-testid="no-token"]').exists()).toBe(true);
      expect(wrapper.find('form').exists()).toBe(false);
    });

    it('FE-PAGE-49 a refused token is shown as the server worded it', async () => {
      route.query = { token: 'stale' };
      const wrapper = page();

      await wrapper.get('#password').setValue('N3wPassw0rd');
      await wrapper.get('#confirmation').setValue('N3wPassw0rd');

      fetchMock.mockResolvedValueOnce(
        json(400, {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'That reset link is no longer valid. Ask for a new one.',
          },
        }),
      );
      await wrapper.get('form').trigger('submit');
      await flushPromises();

      expect(wrapper.get('[role="alert"]').text()).toMatch(/no longer valid/i);
      expect(push).not.toHaveBeenCalled();
    });
  });
});
