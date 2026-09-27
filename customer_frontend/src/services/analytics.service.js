import { apiClient } from './apiClient';

/** Server-computed totals. Aggregates the whole history, not just one page. */
export async function fetchAnalytics({ months = 6 } = {}) {
  return apiClient.get(`/user-analytics?months=${months}`, { auth: true });
}
