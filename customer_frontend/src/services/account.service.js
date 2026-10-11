import { apiClient } from './apiClient';

/** Money only moves to a saved beneficiary, never to a typed account number. */
export async function transfer({ beneficiaryId, amount, description }) {
  const body = { beneficiaryId, amount: Number(amount) };
  const note = description?.trim();
  if (note) body.description = note;

  return apiClient.post('/transfer', body, { auth: true });
}

/** The statement endpoints take the same filters as the table, minus paging. */
function statementParams({ type, startDate, endDate } = {}) {
  const params = new URLSearchParams();

  if (type) params.set('type', type);
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);

  const query = params.toString();
  return query ? `?${query}` : '';
}

/** Returns `{ blob, filename }` — the PDF is binary, not JSON. */
export async function downloadStatement(filters) {
  return apiClient.get(`/transactions/statement${statementParams(filters)}`, {
    auth: true,
    responseType: 'blob',
  });
}

/** Filters ride on the query string here too, so the body stays empty. */
export async function emailStatement(filters) {
  return apiClient.post(
    `/transactions/statement/email${statementParams(filters)}`,
    undefined,
    { auth: true },
  );
}

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
