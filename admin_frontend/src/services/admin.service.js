import { apiClient } from './apiClient';

/** Defaults to the pending queue, which is what the console opens on. */
export async function fetchAccounts({ status = 'pending', page = 1, limit = 10 } = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) params.set('status', status);

  return apiClient.get(`/admin/accounts?${params}`, { auth: true });
}

export async function approveAccount(accountId) {
  return apiClient.patch(`/admin/accounts/${accountId}/approve`, undefined, {
    auth: true,
  });
}

/** The reason is required: a rejection is useless to the customer without it. */
export async function rejectAccount(accountId, reason) {
  return apiClient.patch(
    `/admin/accounts/${accountId}/reject`,
    { reason: reason.trim() },
    { auth: true },
  );
}

/** Oldest first server-side, so the queue is worked in application order. */
export async function fetchLoanRequests({ status = 'pending', page = 1, limit = 10 } = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) params.set('status', status);

  return apiClient.get(`/admin/loan-requests?${params}`, { auth: true });
}

/** Approving also credits the principal to the applicant's account. */
export async function approveLoanRequest(loanId) {
  return apiClient.patch(`/admin/loan-requests/${loanId}/approve`, undefined, {
    auth: true,
  });
}

export async function rejectLoanRequest(loanId, reason) {
  return apiClient.patch(
    `/admin/loan-requests/${loanId}/reject`,
    { reason: reason.trim() },
    { auth: true },
  );
}

export async function fetchInterestRates() {
  return apiClient.get('/admin/interest-rates', { auth: true });
}

/** Sends only `{ label, rate }` pairs — the server ignores anything else. */
export async function updateInterestRates(type, rates) {
  return apiClient.patch(`/admin/interest-rates/${type}`, { rates }, { auth: true });
}

/** Supports a free-text search as well as a status filter. */
export async function fetchCustomers({ status, search, page = 1, limit = 10 } = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) params.set('status', status);
  if (search) params.set('search', search);

  return apiClient.get(`/admin/customers?${params}`, { auth: true });
}

/** Suspending revokes the refresh token, so it signs them out everywhere. */
export async function setCustomerStatus(userId, { status, reason }) {
  const body = { status };
  if (reason) body.reason = reason.trim();

  return apiClient.patch(`/admin/customers/${userId}/status`, body, { auth: true });
}

/** Refused unless the balance is zero and nothing is still running. */
export async function closeAccount(accountId, reason) {
  return apiClient.patch(
    `/admin/accounts/${accountId}/close`,
    { reason: reason.trim() },
    { auth: true },
  );
}
