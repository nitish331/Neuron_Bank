const { roundMoney } = require("./transactionUtils");
const { addDuration } = require("./fixedDepositMath");

// The only terms a customer can pick, in months.
const ALLOWED_TENURES = [3, 6, 12, 24, 36, 60];

// Standard reducing balance EMI: P x r x (1+r)^n / ((1+r)^n - 1), with r the
// monthly rate. A zero rate falls back to a plain split.
function calculateEmi(principal, annualRatePercent, months) {
  if (!annualRatePercent) {
    return roundMoney(principal / months);
  }

  const monthlyRate = annualRatePercent / 12 / 100;
  const growth = (1 + monthlyRate) ** months;

  return roundMoney((principal * monthlyRate * growth) / (growth - 1));
}

// Rounding the EMI leaves a few paise over, so the last instalment carries it
// and the customer never pays more than the total in the schedule.
function buildSchedule({ principal, annualRatePercent, months, startDate }) {
  const emi = calculateEmi(principal, annualRatePercent, months);
  const monthlyRate = annualRatePercent / 12 / 100;

  const rows = [];
  let balance = principal;

  for (let index = 0; index < months; index += 1) {
    const interest = roundMoney(balance * monthlyRate);
    const isLast = index === months - 1;
    const amount = isLast ? roundMoney(balance + interest) : emi;
    const principalPart = roundMoney(amount - interest);

    balance = roundMoney(balance - principalPart);

    rows.push({
      installmentNumber: index + 1,
      dueDate: addDuration(startDate, { months: index + 1 }),
      amount,
      principalPart,
      interestPart: interest,
      balanceAfter: Math.max(0, balance),
    });
  }

  const totalPayable = roundMoney(
    rows.reduce((sum, row) => sum + row.amount, 0),
  );

  return {
    emi,
    rows,
    totalPayable,
    totalInterest: roundMoney(totalPayable - principal),
  };
}

// How many instalments should have been collected by now.
function dueCount(startDate, months, asOf) {
  let due = 0;

  for (let index = 1; index <= months; index += 1) {
    if (addDuration(startDate, { months: index }) <= asOf) {
      due += 1;
    }
  }

  return due;
}

function emiDueDate(startDate, installmentNumber) {
  return addDuration(startDate, { months: installmentNumber });
}

module.exports = {
  ALLOWED_TENURES,
  calculateEmi,
  buildSchedule,
  dueCount,
  emiDueDate,
};
