import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
} from '../utils/authStorage';

/**
 * Thin fetch wrapper around the Neuron Bank API.
 *
 * Base URL comes from REACT_APP_API_BASE_URL (see `.env`). Note the backend
 * mounts its routes at the root, so paths here have no `/api` prefix.
 */
const BASE_URL = (
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000'
).replace(/\/$/, '');

/** Fired when the refresh token is gone too, so the session cannot be saved. */
export const SESSION_EXPIRED_EVENT = 'neuron:session-expired';

/** Fired after a silent refresh, so the store does not keep the old token. */
export const TOKEN_REFRESHED_EVENT = 'neuron:token-refreshed';

/**
 * Error carrying the server's own message, plus per-field messages when the
 * backend replies with `{ errors: [{ field, message }] }`.
 */
export class ApiError extends Error {
  constructor(message, { status, fieldErrors = {} } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

/** Turn the backend's validation array into a { field: message } map. */
function toFieldErrors(errors) {
  if (!Array.isArray(errors)) return {};
  return errors.reduce((acc, item) => {
    if (item?.field && !acc[item.field]) acc[item.field] = item.message;
    return acc;
  }, {});
}

function parseBody(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function emitSessionExpired() {
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
}

// Shared so parallel 401s trigger one refresh instead of one each.
let refreshInFlight = null;

/**
 * Swaps the refresh token for a new access token. Uses raw fetch rather than
 * `request`, so a 401 from here can never recurse back into a refresh.
 * `/refresh-token` returns only `token` — the stored user is left alone.
 */
async function performRefresh() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${BASE_URL}/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) return false;

    const payload = parseBody(await response.text());
    if (!payload?.token) return false;

    setAccessToken(payload.token);
    window.dispatchEvent(
      new CustomEvent(TOKEN_REFRESHED_EVENT, { detail: payload.token }),
    );
    return true;
  } catch {
    return false;
  }
}

export function refreshSession() {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }

  return refreshInFlight;
}

export async function request(
  path,
  { method = 'GET', body, auth = false, retry = true } = {},
) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  if (auth) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    // fetch only rejects on network/CORS failure, never on a 4xx/5xx.
    throw new ApiError(
      'Cannot reach the server. Check that the API is running and try again.',
      { status: 0 },
    );
  }

  // Only 401 on an authenticated call is worth refreshing. A 403 means the
  // account is pending, suspended or rejected, which a new token cannot fix.
  if (response.status === 401 && auth) {
    if (retry && (await refreshSession())) {
      return request(path, { method, body, auth, retry: false });
    }

    // Refresh failed, or the replay 401'd again — stop rather than loop.
    emitSessionExpired();
  }

  const payload = parseBody(await response.text());

  if (!response.ok) {
    throw new ApiError(payload?.message || 'Something went wrong', {
      status: response.status,
      fieldErrors: toFieldErrors(payload?.errors),
    });
  }

  return payload;
}

export const apiClient = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
};
