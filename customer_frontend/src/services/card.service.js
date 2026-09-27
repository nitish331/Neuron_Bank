import { apiClient } from './apiClient';

/** `reveal` asks the server to decrypt the card number and CVV. */
export async function fetchCards({ reveal = false } = {}) {
  const query = reveal ? '?reveal=true' : '';
  return apiClient.get(`/debit-cards${query}`, { auth: true });
}

/** The plain card number and CVV come back once here, and never again. */
export async function requestCard() {
  return apiClient.post('/debit-cards', undefined, { auth: true });
}

/** Every settings change is gated behind a fresh emailed code. */
export async function sendCardOtp(cardId) {
  return apiClient.post(`/debit-cards/${cardId}/send-otp`, undefined, {
    auth: true,
  });
}

export async function updateCard(cardId, { code, dailyLimit, status, pin }) {
  const body = { code };

  if (dailyLimit !== undefined) body.dailyLimit = Number(dailyLimit);
  if (status !== undefined) body.status = status;
  if (pin !== undefined) body.pin = pin;

  return apiClient.patch(`/debit-cards/${cardId}`, body, { auth: true });
}

/** Emails a link to set a new PIN, for when the current one is forgotten. */
export async function forgotCardPin(cardId) {
  return apiClient.post(`/debit-cards/${cardId}/forgot-pin`, undefined, {
    auth: true,
  });
}

/** Public: the emailed token is the proof, so no access token is sent. */
export async function resetCardPin({ token, pin, confirmPin }) {
  return apiClient.post('/debit-cards/reset-pin', { token, pin, confirmPin });
}
