/**
 * Auth token persistence.
 *
 * Everything that touches localStorage for auth goes through here, so swapping
 * to cookies or sessionStorage later is a change to this file alone.
 *
 * Note: localStorage is readable by any script on the origin. It is the usual
 * choice for a JWT in a SPA, but if XSS is a concern the tokens belong in
 * httpOnly cookies issued by the backend instead.
 */

const ACCESS_TOKEN_KEY = 'neuron.accessToken';
const REFRESH_TOKEN_KEY = 'neuron.refreshToken';
const USER_KEY = 'neuron.user';

/** Private-mode Safari and disabled storage both throw on write. */
function safeWrite(key, value) {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeRead(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeRemove(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* nothing useful to do */
  }
}

export function setAccessToken(token) {
  return safeWrite(ACCESS_TOKEN_KEY, token);
}

export function getAccessToken() {
  return safeRead(ACCESS_TOKEN_KEY);
}

export function setRefreshToken(token) {
  return safeWrite(REFRESH_TOKEN_KEY, token);
}

export function getRefreshToken() {
  return safeRead(REFRESH_TOKEN_KEY);
}

export function setStoredUser(user) {
  return safeWrite(USER_KEY, JSON.stringify(user));
}

export function getStoredUser() {
  const raw = safeRead(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    // Corrupt entry is worse than none — drop it.
    safeRemove(USER_KEY);
    return null;
  }
}

/** Persist a full auth response (`token`, `refreshToken`, `data`) in one call. */
export function saveSession({ token, refreshToken, data }) {
  if (token) setAccessToken(token);
  if (refreshToken) setRefreshToken(refreshToken);
  if (data) setStoredUser(data);
}

export function clearSession() {
  safeRemove(ACCESS_TOKEN_KEY);
  safeRemove(REFRESH_TOKEN_KEY);
  safeRemove(USER_KEY);
}

export function isAuthenticated() {
  return Boolean(getAccessToken());
}
