import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory } from 'vue-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../stores/auth';
import { createAppRouter, resolveRedirect } from './index';

/**
 * FE-AUTH-03..06 from docs/test-cases.md §3.1.
 *
 * Guards are async and RETURN a route rather than calling next()
 * (vue-router-best-practices). The redirect-loop cases are the ones that
 * matter: a guard that sends you to /login from /login hangs the app.
 */
describe('Router guards', () => {
  const fetchMock = vi.fn();

  const DEMO = {
    id: 'u1',
    name: 'Ada Lovelace',
    email: 'ada@test.dev',
    warrantyAlertDays: 30,
    returnAlertDays: 7,
  };

  const jsonResponse = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  const signedOut = () =>
    fetchMock.mockResolvedValue(
      jsonResponse(401, { error: { code: 'UNAUTHENTICATED', message: 'Sign in to continue' } }),
    );
  const signedIn = () => fetchMock.mockResolvedValue(jsonResponse(200, DEMO));

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => vi.unstubAllGlobals());

  const router = () => createAppRouter(createMemoryHistory());

  it('FE-AUTH-03 a signed-out visitor is sent to sign in, with where they wanted to go', async () => {
    signedOut();
    const r = router();

    await r.push('/purchases');
    await r.isReady();

    expect(r.currentRoute.value.path).toBe('/login');
    expect(r.currentRoute.value.query.redirect).toBe('/purchases');
  });

  it('FE-AUTH-03 a signed-out visitor at sign in is left alone, not redirected to itself', async () => {
    signedOut();
    const r = router();

    await r.push('/login');

    expect(r.currentRoute.value.path).toBe('/login');
    expect(r.currentRoute.value.query.redirect).toBeUndefined();
  });

  it('FE-AUTH-04 the post-login target is the redirect when there is one', () => {
    expect(resolveRedirect({ redirect: '/purchases' })).toBe('/purchases');
    expect(resolveRedirect({ redirect: '/purchases?category=MOBILE' })).toBe(
      '/purchases?category=MOBILE',
    );
  });

  it('FE-AUTH-04 the post-login target falls back to the dashboard', () => {
    expect(resolveRedirect({})).toBe('/dashboard');
    expect(resolveRedirect({ redirect: '' })).toBe('/dashboard');
    expect(resolveRedirect({ redirect: ['/a', '/b'] })).toBe('/dashboard');
  });

  it('FE-AUTH-04 an off-site redirect is refused', () => {
    // ?redirect= is attacker-controllable: it survives a link in an email.
    // Anything that is not a path on this site is ignored.
    expect(resolveRedirect({ redirect: 'https://evil.example/steal' })).toBe('/dashboard');
    expect(resolveRedirect({ redirect: '//evil.example' })).toBe('/dashboard');
    expect(resolveRedirect({ redirect: 'javascript:alert(1)' })).toBe('/dashboard');
  });

  it('FE-AUTH-05 a signed-in visitor at sign in is moved on, with no loop', async () => {
    signedIn();
    const r = router();

    await r.push('/login');

    expect(r.currentRoute.value.path).toBe('/dashboard');
  });

  it('FE-AUTH-06 a valid cookie restores the session on first navigation', async () => {
    signedIn();
    const r = router();

    await r.push('/purchases');

    expect(r.currentRoute.value.path).toBe('/purchases');
    expect(useAuthStore().user).toEqual(DEMO);

    // Asked once, not on every navigation.
    const meCalls = fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/auth/me'));
    expect(meCalls).toHaveLength(1);

    await r.push('/dashboard');
    const after = fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/auth/me'));
    expect(after).toHaveLength(1);
  });
});
