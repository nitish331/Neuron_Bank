const { roundMoney } = require("./transactionUtils");

const DAY_MS = 86400000;
const DAYS_IN_YEAR = 365;

// Calendar arithmetic, so "1 month" lands on the same date next month rather
// than a fixed 30 days. A short month clamps to its last day.
function addDuration(start, { years = 0, months = 0, days = 0 }) {
  const shifted = new Date(
    Date.UTC(start.getUTCFullYear() + years, start.getUTCMonth() + months, 1),
  );
  const lastDayOfMonth = new Date(
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, 0),
  ).getUTCDate();

  const result = new Date(
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      Math.min(start.getUTCDate(), lastDayOfMonth),
      start.getUTCHours(),
      start.getUTCMinutes(),
      start.getUTCSeconds(),
      start.getUTCMilliseconds(),
    ),
  );

  result.setUTCDate(result.getUTCDate() + days);

  return result;
}

function daysBetween(from, to) {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

const DAYS_IN_MONTH = 30.44;

// The stated tenure, not the elapsed days: six months is 181 days from January
// and 184 from July, and the same choice must always earn the same rate.
function totalMonths({ years = 0, months = 0, days = 0 }) {
  return years * 12 + months + days / DAYS_IN_MONTH;
}

// Bands run from their start up to but not including the next one. The top of
// the table is the one exception, so an exact five years still has a rate.
function findSlab(slabs, months) {
  const last = slabs[slabs.length - 1];

  if (last && months === last.maxMonths) {
    return last;
  }

  return (
    slabs.find((slab) => months >= slab.minMonths && months < slab.maxMonths) ||
    null
  );
}

// Quarterly compounding by default, the way Indian fixed deposits are quoted.
function amountAfter(principal, ratePercent, days, compoundingPerYear = 4) {
  const years = days / DAYS_IN_YEAR;
  const periodRate = ratePercent / 100 / compoundingPerYear;

  return roundMoney(principal * (1 + periodRate) ** (compoundingPerYear * years));
}

// Everything the caller needs to book a deposit, or to preview one.
function quote({
  principal,
  duration,
  slabs,
  startDate = new Date(),
  compoundingPerYear = 4,
}) {
  const maturityDate = addDuration(startDate, duration);
  const tenureDays = daysBetween(startDate, maturityDate);
  const months = totalMonths(duration);
  // The band comes from the stated tenure, the interest from the real days.
  const slab = findSlab(slabs, months);

  if (!slab) {
    return { tenureDays, tenureMonths: months, maturityDate, slab: null };
  }

  const maturityAmount = amountAfter(
    principal,
    slab.rate,
    tenureDays,
    compoundingPerYear,
  );

  return {
    tenureDays,
    tenureMonths: months,
    maturityDate,
    slab,
    maturityAmount,
    interestEarned: roundMoney(maturityAmount - principal),
  };
}

// What a deposit is worth on a given day, used when it is closed early.
function valueOn(deposit, when, compoundingPerYear = 4) {
  const elapsedDays = Math.max(0, daysBetween(deposit.startDate, when));
  const cappedDays = Math.min(elapsedDays, deposit.tenureDays);

  return amountAfter(
    deposit.principal,
    deposit.interestRate,
    cappedDays,
    compoundingPerYear,
  );
}

module.exports = {
  addDuration,
  daysBetween,
  totalMonths,
  findSlab,
  amountAfter,
  quote,
  valueOn,
};
