import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from './auth';

/** FE-AUTH-01..02 from docs/test-cases.md §3.1. */
describe('Auth store', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => vi.unstubAllGlobals());

  const DEMO = {
    id: 'u1',
    name: 'Ada Lovelace',
    email: 'ada@test.dev',
    warrantyAlertDays: 30,
    returnAlertDays: 7,
  };

  const jsonResponse = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  it('FE-AUTH-01 a successful sign-in stores the user', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, DEMO));
    const auth = useAuthStore();

    await auth.login('ada@test.dev', 'Passw0rd1');

    expect(auth.user).toEqual(DEMO);
    expect(auth.isAuthenticated).toBe(true);
    expect(auth.error).toBeNull();
  });

  it('FE-AUTH-02 a rejected sign-in keeps the user null and shows the message', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(401, {
        error: { code: 'UNAUTHENTICATED', message: 'Email or password is incorrect' },
      }),
    );
    const auth = useAuthStore();

    await auth.login('ada@test.dev', 'wrong');

    expect(auth.user).toBeNull();
    expect(auth.isAuthenticated).toBe(false);
    // Shown above the form. It must not say which half was wrong.
    expect(auth.error).toBe('Email or password is incorrect');
    expect(auth.error).not.toMatch(/password is wrong|no such user|unknown email/i);
  });

  it('signing out clears the user even though the cookie is the real session', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, DEMO));
    const auth = useAuthStore();
    await auth.login('ada@test.dev', 'Passw0rd1');

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await auth.logout();

    expect(auth.user).toBeNull();
    expect(auth.isAuthenticated).toBe(false);
  });
});
