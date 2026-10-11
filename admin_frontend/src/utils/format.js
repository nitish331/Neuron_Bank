const INR = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const INR_WHOLE = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** Indian digit grouping, split so the paise can be styled down. */
export function splitAmount(value) {
  const [whole, fraction] = INR.format(Math.abs(value)).split('.');
  return { whole, fraction, isNegative: value < 0 };
}

export function formatCurrency(value) {
  return `₹${INR.format(Math.abs(value))}`;
}

export function formatCompact(value) {
  return `₹${INR_WHOLE.format(Math.abs(value))}`;
}

/** Axis ticks: 60000 reads as ₹60K. */
export function formatAxisTick(value) {
  if (Math.abs(value) >= 1000) return `₹${Math.round(value / 1000)}K`;
  return `₹${value}`;
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}
