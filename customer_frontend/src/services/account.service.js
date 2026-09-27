import { apiClient } from './apiClient';

/** Paginated history. Filters by credit/debit and an inclusive date range. */
export async function fetchTransactions({
  page = 1,
  limit = 20,
  type,
  startDate,
  endDate,
} = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });

  if (type) params.set('type', type);
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);

  return apiClient.get(`/transactions?${params}`, { auth: true });
}

/** Adds money to the signed-in user's own account. Needs the access token. */
export async function deposit({ amount, description }) {
  const body = { amount: Number(amount) };
  const note = description?.trim();
  if (note) body.description = note;

  return apiClient.post('/deposit', body, { auth: true });
}
