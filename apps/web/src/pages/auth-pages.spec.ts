import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import LoginPage from './LoginPage.vue';
import RegisterPage from './RegisterPage.vue';

const push = vi.fn();
const route = { query: {} as Record<string, unknown> };

vi.mock('vue-router', async (original) => ({
  ...(await original<typeof import('vue-router')>()),
  useRouter: () => ({ push, replace: push }),
  useRoute: () => route,
}));

/** FE-PAGE-01..03 from docs/test-cases.md §4. */
describe('Auth pages', () => {
  const fetchMock = vi.fn();

  const DEMO = {
    id: 'u1',
    name: 'Ada Lovelace',
    email: 'ada@test.dev',
    warrantyAlertDays: 30,
    returnAlertDays: 7,
  };

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

  const fill = async (wrapper: ReturnType<typeof mount>, values: Record<string, string>) => {
    for (const [id, value] of Object.entries(values)) {
      await wrapper.get(`#${id}`).setValue(value);
    }
  };

  describe('Sign in', () => {
    it('FE-PAGE-01 a valid submit signs in and moves on to the dashboard', async () => {
      fetchMock.mockResolvedValue(json(200, DEMO));
      const wrapper = mount(LoginPage);

      await fill(wrapper, { email: 'ada@test.dev', password: 'Passw0rd1' });
      await wrapper.get('form').trigger('submit');
      await nextTick();
      await nextTick();

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/api/v1/auth/login');
      expect(init.body).toContain('ada@test.dev');
      expect(push).toHaveBeenCalledWith('/dashboard');
    });

    it('FE-PAGE-01 it returns you to where you were heading', async () => {
      route.query = { redirect: '/purchases' };
      fetchMock.mockResolvedValue(json(200, DEMO));
      const wrapper = mount(LoginPage);

      await fill(wrapper, { email: 'ada@test.dev', password: 'Passw0rd1' });
      await wrapper.get('form').trigger('submit');
      await nextTick();
      await nextTick();

      expect(push).toHaveBeenCalledWith('/purchases');
    });

    it('FE-PAGE-02 a refused sign-in never says which half was wrong', async () => {
      fetchMock.mockResolvedValue(
        json(401, {
          error: { code: 'UNAUTHENTICATED', message: 'Email or password is incorrect' },
        }),
      );
      const wrapper = mount(LoginPage);

      await fill(wrapper, { email: 'ada@test.dev', password: 'wrong' });
      await wrapper.get('form').trigger('submit');
      await nextTick();
      await nextTick();

      const text = wrapper.text();
      expect(text).toContain('Email or password is incorrect');
      // Anything more specific turns the form into a way to discover who has
      // an account (ui-guide §6).
      expect(text).not.toMatch(/password is wrong|incorrect password|no such user|unknown email/i);
      expect(push).not.toHaveBeenCalled();
    });

    it('FE-PAGE-02 the failure is announced, not just painted red', async () => {
      fetchMock.mockResolvedValue(
        json(401, { error: { code: 'UNAUTHENTICATED', message: 'Email or password is incorrect' } }),
      );
      const wrapper = mount(LoginPage);

      await fill(wrapper, { email: 'a@b.dev', password: 'x' });
      await wrapper.get('form').trigger('submit');
      await nextTick();
      await nextTick();

      expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    });

    it('FE-PAGE-02 what was typed survives a failed attempt', async () => {
      fetchMock.mockResolvedValue(
        json(401, { error: { code: 'UNAUTHENTICATED', message: 'Email or password is incorrect' } }),
      );
      const wrapper = mount(LoginPage);

      await fill(wrapper, { email: 'ada@test.dev', password: 'wrong' });
      await wrapper.get('form').trigger('submit');
      await nextTick();

      // Retyping an email after every failure is how people give up.
      expect((wrapper.get('#email').element as HTMLInputElement).value).toBe('ada@test.dev');
    });

    it('offers a way to the password toggle and to creating an account', () => {
      const wrapper = mount(LoginPage);

      expect(wrapper.get('#password').attributes('type')).toBe('password');
      expect(wrapper.text()).toMatch(/create an account|sign up/i);
    });
  });

  describe('Create account', () => {
    it('FE-PAGE-03 the password rule is stated before it is broken', () => {
      const wrapper = mount(RegisterPage);

      // ui-guide §6: register shows the rule as a hint, not as an error you
      // discover by failing.
      expect(wrapper.text()).toMatch(/8/);
      expect(wrapper.text()).toMatch(/letter/i);
      expect(wrapper.text()).toMatch(/number/i);
      expect(wrapper.get('#password').attributes('aria-describedby')).toBeTruthy();
    });

    it('FE-PAGE-03 field errors from the API land on their fields', async () => {
      fetchMock.mockResolvedValue(
        json(400, {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            fields: { email: 'Enter a valid email address', password: 'Password must be 8 to 72 characters' },
          },
        }),
      );
      const wrapper = mount(RegisterPage);

      await fill(wrapper, { name: 'Ada', email: 'nope', password: 'short' });
      await wrapper.get('form').trigger('submit');
      await nextTick();
      await nextTick();

      expect(wrapper.get('#email').attributes('aria-invalid')).toBe('true');
      expect(wrapper.get('#password').attributes('aria-invalid')).toBe('true');
      expect(wrapper.text()).toContain('Enter a valid email address');
      expect(wrapper.get('#name').attributes('aria-invalid')).toBeUndefined();
    });

    it('FE-PAGE-03 a duplicate email is shown as a message, not a silent failure', async () => {
      fetchMock.mockResolvedValue(
        json(409, {
          error: { code: 'CONFLICT', message: 'That email address is already registered' },
        }),
      );
      const wrapper = mount(RegisterPage);

      await fill(wrapper, { name: 'Ada', email: 'ada@test.dev', password: 'Passw0rd1' });
      await wrapper.get('form').trigger('submit');
      await nextTick();
      await nextTick();

      expect(wrapper.text()).toContain('That email address is already registered');
      expect(push).not.toHaveBeenCalled();
    });
  });
});
