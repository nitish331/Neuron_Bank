const mongoose = require("mongoose");
const Account = require("../models/account");
const User = require("../models/user");
const Transaction = require("../models/transaction");
const LoanRequest = require("../models/loanRequest");
const { roundMoney, generateReference } = require("./transactionUtils");
const { buildSchedule, dueCount } = require("./loanMath");
const { sendLoanEmiMissedEmail, sendLoanRepaidEmail } = require("./mailer");

function money(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// The schedule is derived rather than stored, so it always matches the terms.
function scheduleFor(loan) {
  return buildSchedule({
    principal: loan.amount,
    annualRatePercent: loan.interestRate,
    months: loan.tenureMonths,
    startDate: loan.repaymentStartDate,
  });
}

function outstandingOf(loan) {
  return roundMoney(Math.max(0, (loan.totalPayable || 0) - (loan.amountRepaid || 0)));
}

// Takes one instalment, or reports that the balance would not cover it.
async function collectEmi(loan, row) {
  const session = await mongoose.startSession();
  let outcome = { collected: false };

  try {
    await session.withTransaction(async () => {
      const account = await Account.findById(loan.account).session(session);

      if (!account) {
        throw new Error(`Account missing for loan ${loan._id}`);
      }

      const debited = await Account.findOneAndUpdate(
        { _id: account._id, balance: { $gte: row.amount } },
        { $inc: { balance: -row.amount } },
        { returnDocument: "after", session },
      );

      if (!debited) {
        outcome = {
          collected: false,
          balance: roundMoney(account.balance),
          accountNumber: account.accountNumber,
        };
        return;
      }

      await Transaction.create(
        [
          {
            account: account._id,
            sender: loan.user,
            receiver: loan.user,
            senderAccountNumber: account.accountNumber,
            receiverAccountNumber: "NEURON BANK LOAN",
            type: "debit",
            amount: row.amount,
            currency: loan.currency,
            balanceAfter: roundMoney(debited.balance),
            reference: generateReference(),
            description: `Loan EMI ${row.installmentNumber} of ${loan.tenureMonths}`,
            dateTime: new Date(),
          },
        ],
        { session },
      );

      outcome = {
        collected: true,
        balance: roundMoney(debited.balance),
        accountNumber: account.accountNumber,
      };
    });
  } finally {
    await session.endSession();
  }

  return outcome;
}

async function setAccountStatus(accountId, status) {
  await Account.updateOne({ _id: accountId }, { status });
}

// A customer may hold more than one loan, so the block only lifts when none of
// them are behind.
async function liftBlockIfClear(loan) {
  const stillBehind = await LoanRequest.countDocuments({
    user: loan.user,
    account: loan.account,
    status: "approved",
    isOverdue: true,
    _id: { $ne: loan._id },
  });

  if (stillBehind > 0) {
    return false;
  }

  const account = await Account.findById(loan.account).select("status").lean();

  if (account?.status !== "blocked") {
    return false;
  }

  await setAccountStatus(loan.account, "active");

  return true;
}

async function runDueEmis(loan, now) {
  const schedule = scheduleFor(loan);
  const due = dueCount(loan.repaymentStartDate, loan.tenureMonths, now);

  const result = { collected: 0, missed: 0, blocked: false, unblocked: false, repaid: false };

  // Everything from the first unpaid instalment up to what is due today. A
  // missed one stays at the front of the queue until it is paid.
  while (loan.emisPaid < due) {
    const row = schedule.rows[loan.emisPaid];
    const outcome = await collectEmi(loan, row);

    if (!outcome.collected) {
      result.missed += 1;
      loan.emisMissed += 1;

      if (!loan.isOverdue) {
        loan.isOverdue = true;
      }

      await loan.save();
      await setAccountStatus(loan.account, "blocked");
      result.blocked = true;

      const owner = await User.findById(loan.user).select("name email").lean();

      if (owner) {
        try {
          await sendLoanEmiMissedEmail(owner.email, {
            name: owner.name,
            accountNumber: outcome.accountNumber,
            installmentNumber: row.installmentNumber,
            totalEmis: loan.tenureMonths,
            emiAmount: money(row.amount),
            balance: money(outcome.balance ?? 0),
            emisMissed: loan.emisMissed,
            outstanding: money(outstandingOf(loan)),
          });
        } catch (error) {
          console.error("Loan EMI missed email failed:", error.message);
        }
      }

      // No point trying later instalments when this one could not be met.
      break;
    }

    loan.emisPaid += 1;
    loan.amountRepaid = roundMoney(loan.amountRepaid + row.amount);
    loan.lastEmiDate = new Date();
    result.collected += 1;

    if (loan.emisPaid >= loan.tenureMonths) {
      loan.status = "repaid";
      loan.repaidAt = new Date();
      loan.isOverdue = false;
      result.repaid = true;
    }

    await loan.save();
  }

  // Arrears are clear once nothing is outstanding for today.
  if (loan.isOverdue && loan.emisPaid >= due) {
    loan.isOverdue = false;
    await loan.save();
    result.unblocked = await liftBlockIfClear(loan);
  }

  if (result.repaid) {
    if (!result.unblocked) {
      await liftBlockIfClear(loan);
    }

    const owner = await User.findById(loan.user).select("name email").lean();

    if (owner) {
      try {
        await sendLoanRepaidEmail(owner.email, {
          name: owner.name,
          amount: money(loan.amount),
          purpose: loan.purpose,
          interestRate: loan.interestRate,
          rateLabel: loan.rateLabel,
          emisPaid: loan.emisPaid,
          amountRepaid: money(loan.amountRepaid),
          totalInterest: money(loan.totalInterest),
        });
      } catch (error) {
        console.error("Loan repaid email failed:", error.message);
      }
    }
  }

  return result;
}

// Collects every instalment that has fallen due across all running loans.
async function settleLoanEmis(now = new Date()) {
  const result = { collected: 0, missed: 0, blocked: 0, unblocked: 0, repaid: 0, failed: 0 };

  const running = await LoanRequest.find({
    status: "approved",
    repaymentStartDate: { $ne: null, $lte: now },
  });

  for (const loan of running) {
    try {
      const outcome = await runDueEmis(loan, now);

      result.collected += outcome.collected;
      result.missed += outcome.missed;
      result.blocked += outcome.blocked ? 1 : 0;
      result.unblocked += outcome.unblocked ? 1 : 0;
      result.repaid += outcome.repaid ? 1 : 0;
    } catch (error) {
      result.failed += 1;
      console.error(`Loan ${loan._id} EMI run failed:`, error.message);
    }
  }

  return result;
}

module.exports = {
  settleLoanEmis,
  scheduleFor,
  outstandingOf,
  money,
};
