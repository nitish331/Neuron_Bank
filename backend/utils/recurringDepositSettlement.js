const mongoose = require("mongoose");
const Account = require("../models/account");
const User = require("../models/user");
const Transaction = require("../models/transaction");
const RecurringDeposit = require("../models/recurringDeposit");
const InterestRate = require("../models/interestRate");
const { roundMoney, generateReference } = require("./transactionUtils");
const { addDuration } = require("./fixedDepositMath");
const { valueOfPayments } = require("./recurringDepositMath");
const {
  sendDepositReminderEmail,
  sendDepositMaturedEmail,
  sendInstallmentFailedEmail,
} = require("./mailer");
const { creditAccount, money, REMINDER_DAYS } = require("./fixedDepositSettlement");

const DAY_MS = 86400000;
const DEPOSIT_TYPE = "recurring deposit";

function longDate(value) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function describeTenure(deposit) {
  const parts = [];

  if (deposit.durationYears) parts.push(`${deposit.durationYears} year${deposit.durationYears > 1 ? "s" : ""}`);
  if (deposit.durationMonths) parts.push(`${deposit.durationMonths} month${deposit.durationMonths > 1 ? "s" : ""}`);

  return parts.join(" ") || `${deposit.totalInstallments} months`;
}

// Moves one instalment out of the savings account and records it. The debit is
// conditional, so a thin balance is a miss rather than an overdraft.
async function collectInstallment(deposit) {
  const session = await mongoose.startSession();
  let outcome = { collected: false };

  try {
    await session.withTransaction(async () => {
      const account = await Account.findById(deposit.account).session(session);

      if (!account) {
        throw new Error(`Account missing for deposit ${deposit.depositNumber}`);
      }

      const debited = await Account.findOneAndUpdate(
        { _id: account._id, balance: { $gte: deposit.installmentAmount } },
        { $inc: { balance: -deposit.installmentAmount } },
        { returnDocument: "after", session },
      );

      if (!debited) {
        outcome = { collected: false, balance: roundMoney(account.balance), accountNumber: account.accountNumber };
        return;
      }

      const paidAt = new Date();
      const installmentNumber = deposit.installmentsPaid + 1;

      await Transaction.create(
        [
          {
            account: account._id,
            sender: deposit.user,
            receiver: deposit.user,
            senderAccountNumber: account.accountNumber,
            receiverAccountNumber: deposit.depositNumber,
            type: "debit",
            amount: deposit.installmentAmount,
            currency: deposit.currency,
            balanceAfter: roundMoney(debited.balance),
            reference: generateReference(),
            description: `Recurring deposit ${deposit.depositNumber} instalment ${installmentNumber}`,
            dateTime: paidAt,
          },
        ],
        { session },
      );

      deposit.payments.push({
        installmentNumber,
        amount: deposit.installmentAmount,
        paidAt,
      });
      deposit.installmentsPaid = installmentNumber;
      deposit.totalDeposited = roundMoney(
        deposit.totalDeposited + deposit.installmentAmount,
      );

      outcome = {
        collected: true,
        installmentNumber,
        accountNumber: account.accountNumber,
        balance: roundMoney(debited.balance),
      };
    });
  } finally {
    await session.endSession();
  }

  return outcome;
}

// Due dates never move, so a missed month is skipped rather than retried. The
// deposit simply ends up with fewer instalments and less interest.
function advanceSchedule(deposit) {
  const nextIndex = deposit.installmentsPaid + deposit.missedInstallments;

  deposit.nextInstallmentDate =
    nextIndex >= deposit.totalInstallments
      ? null
      : addDuration(deposit.startDate, { months: nextIndex });
}

async function runDueInstallments(deposit, now) {
  let collected = 0;

  // A sweep that was missed could leave several instalments outstanding.
  while (
    deposit.nextInstallmentDate &&
    deposit.nextInstallmentDate <= now &&
    deposit.installmentsPaid + deposit.missedInstallments < deposit.totalInstallments
  ) {
    const outcome = await collectInstallment(deposit);

    if (outcome.collected) {
      collected += 1;
      advanceSchedule(deposit);
      await deposit.save();
      continue;
    }

    deposit.missedInstallments += 1;
    advanceSchedule(deposit);
    await deposit.save();

    const owner = await User.findById(deposit.user).select("name email").lean();

    if (owner) {
      try {
        await sendInstallmentFailedEmail(owner.email, {
          name: owner.name,
          depositNumber: deposit.depositNumber,
          accountNumber: outcome.accountNumber,
          installmentNumber: deposit.installmentsPaid + deposit.missedInstallments,
          totalInstallments: deposit.totalInstallments,
          installmentAmount: money(deposit.installmentAmount),
          balance: money(outcome.balance ?? 0),
          missedInstallments: deposit.missedInstallments,
          nextInstallmentDate: deposit.nextInstallmentDate
            ? longDate(deposit.nextInstallmentDate)
            : "none, the term has ended",
        });
      } catch (error) {
        console.error("Instalment failed email failed:", error.message);
      }
    }
  }

  return collected;
}

async function matureDeposit(deposit) {
  // Worked out from the instalments actually received, so a missed month is
  // reflected in the payout rather than ignored.
  const payout = valueOfPayments(
    deposit.payments,
    deposit.maturityDate,
    deposit.interestRate,
    deposit.compoundingPerYear,
  );

  const account = await creditAccount({
    deposit,
    amount: payout,
    description: `Recurring deposit ${deposit.depositNumber} matured`,
  });

  deposit.status = "matured";
  deposit.settledAt = new Date();
  deposit.payoutAmount = payout;
  deposit.nextInstallmentDate = null;
  await deposit.save();

  const owner = await User.findById(deposit.user).select("name email").lean();

  if (owner) {
    // The money is already in the account, so a mail failure must not undo it.
    try {
      await sendDepositMaturedEmail(owner.email, {
        name: owner.name,
        depositType: DEPOSIT_TYPE,
        depositNumber: deposit.depositNumber,
        accountNumber: account.accountNumber,
        principal: money(deposit.totalDeposited),
        interestEarned: money(roundMoney(payout - deposit.totalDeposited)),
        interestRate: deposit.interestRate,
        rateLabel: deposit.rateLabel,
        tenure: describeTenure(deposit),
        payoutAmount: money(payout),
      });
    } catch (error) {
      console.error("Deposit matured email failed:", error.message);
    }
  }
}

async function remindAboutDeposit(deposit, penaltyPercent) {
  const owner = await User.findById(deposit.user).select("name email").lean();

  if (!owner) {
    return;
  }

  const account = await Account.findById(deposit.account).select("accountNumber").lean();
  const daysLeft = Math.max(
    1,
    Math.ceil((deposit.maturityDate.getTime() - Date.now()) / DAY_MS),
  );

  await sendDepositReminderEmail(owner.email, {
    name: owner.name,
    depositType: DEPOSIT_TYPE,
    daysLeft,
    depositNumber: deposit.depositNumber,
    accountNumber: account?.accountNumber ?? "your account",
    principal: money(deposit.totalDeposited),
    interestRate: deposit.interestRate,
    rateLabel: deposit.rateLabel,
    maturityAmount: money(deposit.maturityAmount),
    maturityDate: longDate(deposit.maturityDate),
    penaltyPercent,
  });

  deposit.reminderSentAt = new Date();
  await deposit.save();
}

// Collects anything due, credits anything matured, warns anything close.
async function settleRecurringDeposits(now = new Date()) {
  const result = { collected: 0, missed: 0, matured: 0, reminded: 0, failed: 0 };

  const active = await RecurringDeposit.find({ status: "active" });

  for (const deposit of active) {
    try {
      const before = deposit.missedInstallments;

      result.collected += await runDueInstallments(deposit, now);
      result.missed += deposit.missedInstallments - before;

      if (deposit.maturityDate <= now) {
        await matureDeposit(deposit);
        result.matured += 1;
      }
    } catch (error) {
      result.failed += 1;
      console.error(`Recurring deposit ${deposit.depositNumber} failed:`, error.message);
    }
  }

  const config = await InterestRate.findOne({ type: "recurringDeposit" })
    .select("prematureClosurePenaltyPercent")
    .lean();

  const upcoming = await RecurringDeposit.find({
    status: "active",
    reminderSentAt: null,
    maturityDate: {
      $gt: now,
      $lte: new Date(now.getTime() + REMINDER_DAYS * DAY_MS),
    },
  });

  for (const deposit of upcoming) {
    try {
      await remindAboutDeposit(deposit, config?.prematureClosurePenaltyPercent ?? 1);
      result.reminded += 1;
    } catch (error) {
      result.failed += 1;
      console.error(`Reminder for ${deposit.depositNumber} failed:`, error.message);
    }
  }

  return result;
}

module.exports = {
  DEPOSIT_TYPE,
  settleRecurringDeposits,
  collectInstallment,
  advanceSchedule,
  describeTenure,
  longDate,
};
