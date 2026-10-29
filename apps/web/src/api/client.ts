/**
 * One way to call the API, and one shape for everything that can go wrong.
 *
 * The API produces exactly one error body (CLAUDE.md non-negotiable 7), so the
 * client turns every failure — a 400, a 502 with an HTML body, a dead network —
 * into the same ApiError. A screen should never have to tell those apart.
 */

const BASE = '/api/v1';

export interface ApiErrorFields {
  [field: string]: string;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fields?: ApiErrorFields;

  constructor(code: string, message: string, status: number, fields?: ApiErrorFields) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    if (fields) this.fields = fields;
  }
}

type UnauthorizedHandler = (() => void) | null;

let unauthorizedHandler: UnauthorizedHandler = null;

/** Registered once at startup, so the client never imports the router or a
 *  store and stays trivially testable. */
export function onUnauthorized(handler: UnauthorizedHandler): void {
  unauthorizedHandler = handler;
}

export interface ApiRequest extends Omit<RequestInit, 'body'> {
  /** Serialised as JSON, or sent as-is when it is FormData (receipt upload). */
  body?: unknown;
  /** Set on /auth/me and /auth/logout: a 401 there is an answer, not an expiry. */
  skipAuthRedirect?: boolean;
}

const CODE_BY_STATUS: Record<number, string> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  415: 'UNSUPPORTED_MEDIA_TYPE',
};

async function readErrorBody(
  response: Response,
): Promise<{ code?: string; message?: string; fields?: ApiErrorFields } | null> {
  try {
    const body = (await response.json()) as { error?: Record<string, unknown> };
    return (body.error ?? null) as { code?: string; message?: string; fields?: ApiErrorFields } | null;
  } catch {
    // A proxy or gateway can return HTML. That is still an error, just not ours.
    return null;
  }
}

export async function api<T>(path: string, request: ApiRequest = {}): Promise<T> {
  const { body, skipAuthRedirect, headers, ...rest } = request;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      ...rest,
      // Without this the httpOnly session cookie is never sent (D-04).
      credentials: 'include',
      headers: {
        ...(body !== undefined && !isFormData ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      // FormData sets its own multipart boundary; stringifying it would destroy it.
      body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      'NETWORK',
      'Could not reach the server. Check your connection and try again.',
      0,
    );
  }

  if (!response.ok) {
    const error = await readErrorBody(response);

    if (response.status === 401 && !skipAuthRedirect) unauthorizedHandler?.();

    throw new ApiError(
      error?.code ?? CODE_BY_STATUS[response.status] ?? 'INTERNAL',
      error?.message ?? 'Something went wrong. Please try again.',
      response.status,
      error?.fields,
    );
  }

  // 204 No Content has no body to parse — logout and every delete return one.
  if (response.status === 204 || response.status === 205) return undefined as T;

  return (await response.json()) as T;
}
