import { apiClient } from './apiClient';

/** Always 200, whether or not the address exists, so it leaks no accounts. */
export async function requestPasswordReset(email) {
  return apiClient.post('/forgot-password', { email: email.trim() });
}

/** Consumes the emailed token and signs the user out everywhere. */
export async function resetPassword({ token, password, confirmPassword }) {
  return apiClient.post('/reset-password', { token, password, confirmPassword });
}
