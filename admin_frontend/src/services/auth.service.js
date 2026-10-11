import { apiClient } from './apiClient';
import { getRefreshToken } from '../utils/authStorage';

/** Revokes the refresh token. Idempotent server-side, and never throws here. */
export async function logout() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return;

  try {
    await apiClient.post('/logout', { refreshToken });
  } catch {
    /* a dead network must not strand the user on the dashboard */
  }
}

/** Login step 1: a correct password emails a code, it does not start a session. */
export async function login({ email, password }) {
  return apiClient.post('/login', { email: email.trim(), password });
}

/** Step 2: exchange the emailed code for a session. The code is single-use. */
export async function verifyLoginCode({ email, code }) {
  return apiClient.post('/verify-login-code', { email, code });
}
