import { apiClient } from './apiClient';

export async function fetchBeneficiaries() {
  return apiClient.get('/beneficiaries', { auth: true });
}

/** The server matches both the number and the holder name before saving. */
export async function addBeneficiary({ accountNumber, name }) {
  return apiClient.post(
    '/beneficiaries',
    { accountNumber: accountNumber.trim(), name: name.trim() },
    { auth: true },
  );
}

/** `action` ties the emailed code to update or delete, so one cannot do the other. */
export async function sendBeneficiaryOtp(beneficiaryId, action) {
  return apiClient.post(
    `/beneficiaries/${beneficiaryId}/send-otp`,
    { action },
    { auth: true },
  );
}

export async function updateBeneficiary(beneficiaryId, { code, status }) {
  return apiClient.patch(
    `/beneficiaries/${beneficiaryId}`,
    { code, status },
    { auth: true },
  );
}

export async function removeBeneficiary(beneficiaryId, { code }) {
  return apiClient.delete(
    `/beneficiaries/${beneficiaryId}`,
    { code },
    { auth: true },
  );
}
