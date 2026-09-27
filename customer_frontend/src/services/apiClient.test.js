import { request, SESSION_EXPIRED_EVENT } from './apiClient';

const OLD = 'Bearer old-token';
const NEW = 'Bearer new-token';

function reply(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  };
}

let refreshCalls;
let protectedCalls;

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem('neuron.accessToken', 'old-token');
  window.localStorage.setItem('neuron.refreshToken', 'refresh-token');
  refreshCalls = 0;
  protectedCalls = 0;
});

/** Rejects the old token, accepts the refreshed one. */
function server({ refreshOk = true, alwaysReject = false } = {}) {
  return jest.fn(async (url, options) => {
    if (url.endsWith('/refresh-token')) {
      refreshCalls += 1;
      return refreshOk
        ? reply(200, { success: true, token: 'new-token' })
        : reply(401, { success: false, message: 'Refresh token is invalid or expired' });
    }

    protectedCalls += 1;
    const auth = options.headers.Authorization;

    if (!alwaysReject && auth === NEW) {
      return reply(200, { success: true, data: { ok: true } });
    }
    return reply(401, { success: false, message: 'Access token is invalid or expired' });
  });
}

test('parallel 401s share one refresh and all replay successfully', async () => {
  global.fetch = server();

  const results = await Promise.all([
    request('/a', { auth: true }),
    request('/b', { auth: true }),
    request('/c', { auth: true }),
  ]);

  expect(refreshCalls).toBe(1);
  expect(results.every((r) => r.success)).toBe(true);
  // Three 401s, then three replays.
  expect(protectedCalls).toBe(6);
});

test('a replay that 401s again gives up instead of looping', async () => {
  global.fetch = server({ alwaysReject: true });
  const onExpired = jest.fn();
  window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);

  await expect(request('/a', { auth: true })).rejects.toMatchObject({ status: 401 });

  expect(refreshCalls).toBe(1);
  // Original plus exactly one replay — no third attempt.
  expect(protectedCalls).toBe(2);
  expect(onExpired).toHaveBeenCalledTimes(1);

  window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
});

test('a failed refresh signals session expiry', async () => {
  global.fetch = server({ refreshOk: false });
  const onExpired = jest.fn();
  window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);

  await expect(request('/a', { auth: true })).rejects.toMatchObject({ status: 401 });

  expect(refreshCalls).toBe(1);
  expect(protectedCalls).toBe(1);
  expect(onExpired).toHaveBeenCalled();

  window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
});

test('403 never triggers a refresh', async () => {
  global.fetch = jest.fn(async (url) => {
    if (url.endsWith('/refresh-token')) {
      refreshCalls += 1;
      return reply(200, { success: true, token: 'new-token' });
    }
    return reply(403, { success: false, message: 'Your account is pending' });
  });

  await expect(request('/a', { auth: true })).rejects.toMatchObject({ status: 403 });
  expect(refreshCalls).toBe(0);
});

test('an unauthenticated 401 surfaces as a normal error', async () => {
  global.fetch = jest.fn(async (url) => {
    if (url.endsWith('/refresh-token')) {
      refreshCalls += 1;
      return reply(200, { success: true, token: 'new-token' });
    }
    return reply(401, { success: false, message: 'Invalid email or password' });
  });

  await expect(request('/login', { method: 'POST', body: {} })).rejects.toMatchObject({
    status: 401,
    message: 'Invalid email or password',
  });
  expect(refreshCalls).toBe(0);
});
