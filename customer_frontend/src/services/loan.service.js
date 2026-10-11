import { apiClient } from './apiClient';

/** Passing `amount` makes the server quote a real EMI per tenure. */
export async function fetchLoanRates(amount) {
  const query = amount ? `?amount=${encodeURIComponent(amount)}` : '';
  return apiClient.get(`/loan-requests/rates${query}`, { auth: true });
}

export async function fetchLoanRequests({ status, page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) params.set('status', status);

  return apiClient.get(`/loan-requests?${params}`, { auth: true });
}

export async function applyForLoan({ amount, purpose, tenureMonths, monthlyIncome }) {
  return apiClient.post(
    '/loan-requests',
    {
      amount: Number(amount),
      purpose: purpose.trim(),
      tenureMonths: Number(tenureMonths),
      monthlyIncome: Number(monthlyIncome),
    },
    { auth: true },
  );
}
