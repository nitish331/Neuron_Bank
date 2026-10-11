const { roundMoney } = require("./transactionUtils");
const { addDuration, daysBetween, amountAfter } = require("./fixedDepositMath");

// Each instalment earns interest only for the time it is actually held, so the
// first one earns for the whole term and the last for almost nothing.
function projectMaturity({
  installmentAmount,
  totalInstallments,
  rate,
  startDate,
  compoundingPerYear = 4,
}) {
  const maturityDate = addDuration(startDate, { months: totalInstallments });

  let maturityAmount = 0;

  for (let index = 0; index < totalInstallments; index += 1) {
    const dueDate = addDuration(startDate, { months: index });
    const heldDays = daysBetween(dueDate, maturityDate);

    maturityAmount += amountAfter(
      installmentAmount,
      rate,
      heldDays,
      compoundingPerYear,
    );
  }

  const totalDeposited = roundMoney(installmentAmount * totalInstallments);

  return {
    maturityDate,
    maturityAmount: roundMoney(maturityAmount),
    totalDeposited,
    interestEarned: roundMoney(maturityAmount - totalDeposited),
    tenureDays: daysBetween(startDate, maturityDate),
  };
}

// What the instalments received so far are worth on a given day. Used both at
// maturity and when a deposit is closed early, so a missed month is handled by
// simply not being in the list.
function valueOfPayments(payments, asOf, rate, compoundingPerYear = 4) {
  const total = payments.reduce((sum, payment) => {
    const heldDays = Math.max(0, daysBetween(payment.paidAt, asOf));

    return sum + amountAfter(payment.amount, rate, heldDays, compoundingPerYear);
  }, 0);

  return roundMoney(total);
}

// The month a given instalment is due, counted from the day the deposit opened.
function installmentDueDate(startDate, index) {
  return addDuration(startDate, { months: index });
}

module.exports = {
  projectMaturity,
  valueOfPayments,
  installmentDueDate,
};
