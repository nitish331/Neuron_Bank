import { apiClient } from './apiClient';
import { getRefreshToken } from '../utils/authStorage';

/** Signup step 1: email a 6-digit code. 409 if the address is already taken. */
export async function sendVerificationCode(email) {
  return apiClient.post('/send-verification-code', { email: email.trim() });
}

/** Signup step 2: check the code and mark the address verified for 30 minutes. */
export async function verifyEmailCode({ email, code }) {
  return apiClient.post('/verify-email-code', { email, code });
}

/** Signup step 3: needs a verified record for this email, else 403. */
export async function register({
  firstName,
  lastName,
  email,
  dialCode,
  phoneNumber,
  dateOfBirth,
  password,
}) {
  const response = await apiClient.post('/register', {
    name: `${firstName.trim()} ${lastName.trim()}`.trim(),
    email: email.trim(),
    phoneNumber: `${dialCode}${phoneNumber.replace(/\D/g, '')}`,
    dateOfBirth,
    password,
  });

  return response;
}

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
