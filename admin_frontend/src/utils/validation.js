/**
 * Client-side field validation.
 *
 * These rules deliberately mirror `backend/middleware/auth.validation.js`. The
 * server stays the source of truth — this only exists to give instant feedback
 * and avoid a round trip for obvious mistakes. If you change a rule here,
 * change it there too.
 */

// Backend: /^\+?[1-9]\d{9,14}$/ — 10 to 15 digits, optional leading +.
const PHONE_PATTERN = /^\+?[1-9]\d{9,14}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateName(value, label) {
  const trimmed = value.trim();
  if (!trimmed) return `${label} is required`;
  return '';
}

/** Backend stores one `name`; the form collects it as two fields. */
export function validateFullName(firstName, lastName) {
  const full = `${firstName.trim()} ${lastName.trim()}`.trim();
  if (full.length < 2) return 'Name must be at least 2 characters';
  if (full.length > 100) return 'Name must not exceed 100 characters';
  return '';
}

export function validateEmail(value) {
  const trimmed = value.trim();
  if (!trimmed) return 'Email is required';
  if (!EMAIL_PATTERN.test(trimmed)) return 'Please provide a valid email';
  return '';
}

/** A value the user clearly meant as a phone number, not an email. */
function looksLikePhoneNumber(value) {
  return /^\+?[\d\s()-]{6,}$/.test(value);
}

/** Sign-in accepts an email only — `/login` validates with `isEmail()`. */
export function validateLoginIdentifier(value) {
  const trimmed = value.trim();
  if (!trimmed) return 'Email is required';
  if (looksLikePhoneNumber(trimmed)) {
    return 'Sign in with your email address, not a mobile number';
  }
  if (!EMAIL_PATTERN.test(trimmed)) return 'Please provide a valid email';
  return '';
}

export function validatePhoneNumber(dialCode, value) {
  const digits = value.replace(/\D/g, '');
  if (!digits) return 'Phone number is required';
  if (!PHONE_PATTERN.test(`${dialCode}${digits}`)) {
    return 'Enter a valid mobile number';
  }
  return '';
}

export function validateDateOfBirth(value) {
  if (!value) return 'Date of birth is required';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Enter a valid date';
  if (date > new Date()) return 'Date of birth cannot be in the future';

  return '';
}

/**
 * Backend requires 8+ chars with lower, upper, number and symbol.
 * Returned as a checklist so the UI can show which rules are still unmet.
 */
export const PASSWORD_RULES = [
  { id: 'length', label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { id: 'lower', label: 'One lowercase letter', test: (v) => /[a-z]/.test(v) },
  { id: 'upper', label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { id: 'number', label: 'One number', test: (v) => /\d/.test(v) },
  {
    id: 'symbol',
    label: 'One symbol',
    test: (v) => /[^A-Za-z0-9]/.test(v),
  },
];

export function validatePassword(value) {
  if (!value) return 'Password is required';
  if (value.length > 128) return 'Password must not exceed 128 characters';
  if (PASSWORD_RULES.some((rule) => !rule.test(value))) {
    return 'Password does not meet all the requirements';
  }
  return '';
}

export function validateConfirmPassword(password, confirmPassword) {
  if (!confirmPassword) return 'Please confirm your password';
  if (password !== confirmPassword) return 'Passwords do not match';
  return '';
}

export const MAX_TRANSACTION_AMOUNT = 1000000;
export const MAX_DESCRIPTION_LENGTH = 140;

/** Mirrors amountValidation() in backend/middleware/transaction.validation.js. */
export function validateAmount(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return 'Amount is required';
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return 'Enter a valid amount with at most 2 decimal places';
  }

  const amount = Number(trimmed);
  if (amount <= 0) return 'Amount must be greater than zero';
  if (amount > MAX_TRANSACTION_AMOUNT) {
    return 'Amount must not exceed ₹10,00,000 per transaction';
  }

  return '';
}

export function validateDescription(value) {
  if (String(value ?? '').trim().length > MAX_DESCRIPTION_LENGTH) {
    return `Description must not exceed ${MAX_DESCRIPTION_LENGTH} characters`;
  }
  return '';
}

/** True when every value in an errors object is empty. */
export function isClean(errors) {
  return Object.values(errors).every((message) => !message);
}
