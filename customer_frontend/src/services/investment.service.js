import { apiClient } from './apiClient';

/** The two products share a shape, so one set of calls covers both. */
const BASE = {
  fd: '/fixed-deposits',
  rd: '/recurring-deposits',
};

export async function fetchRates(product) {
  return apiClient.get(`${BASE[product]}/rates`, { auth: true });
}

export async function fetchDeposits(product) {
  return apiClient.get(BASE[product], { auth: true });
}

/** FD takes `amount` and may include days; RD takes `installmentAmount`. */
export async function openDeposit(product, body) {
  return apiClient.post(BASE[product], body, { auth: true });
}

export async function sendCloseOtp(product, depositId) {
  return apiClient.post(`${BASE[product]}/${depositId}/send-otp`, undefined, {
    auth: true,
  });
}

export async function closeDeposit(product, depositId, code) {
  return apiClient.post(`${BASE[product]}/${depositId}/close`, { code }, {
    auth: true,
  });
}
