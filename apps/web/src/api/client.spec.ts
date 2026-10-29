import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api, onUnauthorized } from './client';

/**
 * FE-API-01..04 from docs/test-cases.md §3.1.
 *
 * Every failure the UI can show has to arrive in one shape, the same way the
 * API produces one shape (CLAUDE.md non-negotiable 7). A screen should never
 * have to tell a 400 body from a thrown TypeError.
 */
describe('API client', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    onUnauthorized(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const jsonResponse = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  it('FE-API-01 sends cookies, to the versioned path, as JSON', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { id: '1' }));

    await api('/purchases', { method: 'POST', body: { productName: 'Kettle' } });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/v1/purchases');
    // Without this the httpOnly session cookie is never sent and every
    // request is anonymous (D-04).
    expect(init.credentials).toBe('include');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' });
    expect(init.body).toBe('{"productName":"Kettle"}');
  });

  it('FE-API-02 turns a validation failure into an ApiError carrying its fields', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          fields: { price: 'Must be 0 or more' },
        },
      }),
    );

    const failure = await api('/purchases', { method: 'POST', body: {} }).catch(
      (e: unknown) => e,
    );

    expect(failure).toBeInstanceOf(ApiError);
    const error = failure as ApiError;
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.status).toBe(400);
    // The form needs these to put each message beside its input.
    expect(error.fields).toEqual({ price: 'Must be 0 or more' });
  });

  it('FE-API-03 a 401 on a data call tells the app the session is gone', async () => {
    const handler = vi.fn();
    onUnauthorized(handler);

    fetchMock.mockResolvedValue(
      jsonResponse(401, { error: { code: 'UNAUTHENTICATED', message: 'Sign in to continue' } }),
    );

    await expect(api('/purchases')).rejects.toBeInstanceOf(ApiError);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('FE-API-03 a 401 while checking the session does not trigger the handler', async () => {
    const handler = vi.fn();
    onUnauthorized(handler);

    fetchMock.mockResolvedValue(
      jsonResponse(401, { error: { code: 'UNAUTHENTICATED', message: 'Sign in to continue' } }),
    );

    // /auth/me is how the app asks "am I signed in?". Answering "no" must not
    // be treated as the session expiring, or startup redirects in a loop.
    await expect(api('/auth/me', { skipAuthRedirect: true })).rejects.toBeInstanceOf(ApiError);
    expect(handler).not.toHaveBeenCalled();
  });

  it('FE-API-04 a dead network becomes a readable ApiError, not a raw TypeError', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const failure = (await api('/purchases').catch((e: unknown) => e)) as ApiError;

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure.code).toBe('NETWORK');
    expect(failure.message).toMatch(/could not reach|connection|offline/i);
    // "Failed to fetch" is not something to show a user.
    expect(failure.message).not.toBe('Failed to fetch');
  });

  it('FE-API-04 a non-JSON error body still produces an ApiError', async () => {
    fetchMock.mockResolvedValue(new Response('<html>502</html>', { status: 502 }));

    const failure = (await api('/purchases').catch((e: unknown) => e)) as ApiError;

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure.code).toBe('INTERNAL');
    expect(failure.status).toBe(502);
  });

  it('returns nothing for 204, rather than failing to parse an empty body', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(api('/purchases/1', { method: 'DELETE' })).resolves.toBeUndefined();
  });
});
