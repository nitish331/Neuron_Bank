const mongoose = require("mongoose");
const Account = require("../models/account");
const User = require("../models/user");
const Transaction = require("../models/transaction");
const FixedDeposit = require("../models/fixedDeposit");
const InterestRate = require("../models/interestRate");
const { roundMoney, generateReference } = require("./transactionUtils");
const { sendDepositReminderEmail, sendDepositMaturedEmail } = require("./mailer");

const DAY_MS = 86400000;
const REMINDER_DAYS = 5;

function money(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

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
  if (deposit.durationDays) parts.push(`${deposit.durationDays} day${deposit.durationDays > 1 ? "s" : ""}`);

  return parts.join(" ") || `${deposit.tenureDays} days`;
}

// Moves money into the savings account and records it, inside one transaction.
async function creditAccount({ deposit, amount, description }) {
  const session = await mongoose.startSession();
  let credited;

  try {
    await session.withTransaction(async () => {
      const account = await Account.findOneAndUpdate(
        { _id: deposit.account },
        { $inc: { balance: amount } },
        { returnDocument: "after", session },
      );

      if (!account) {
        throw new Error(`Account missing for deposit ${deposit.depositNumber}`);
      }

      await Transaction.create(
        [
          {
            account: account._id,
            sender: deposit.user,
            receiver: deposit.user,
            // The deposit is the counterparty, so history shows where it came from.
            senderAccountNumber: deposit.depositNumber,
            receiverAccountNumber: account.accountNumber,
            type: "credit",
            amount,
            currency: deposit.currency,
            balanceAfter: roundMoney(account.balance),
            reference: generateReference(),
            description,
            dateTime: new Date(),
          },
        ],
        { session },
      );

      credited = account;
    });
  } finally {
    await session.endSession();
  }

  return credited;
}

async function matureDeposit(deposit) {
  const payout = roundMoney(deposit.maturityAmount);

  const account = await creditAccount({
    deposit,
    amount: payout,
    description: `Fixed deposit ${deposit.depositNumber} matured`,
  });

  deposit.status = "matured";
  deposit.settledAt = new Date();
  deposit.payoutAmount = payout;
  await deposit.save();

  const owner = await User.findById(deposit.user).select("name email").lean();

  if (owner) {
    // The money is already in the account, so a mail failure must not undo it.
    try {
      await sendDepositMaturedEmail(owner.email, {
        name: owner.name,
        depositType: "fixed deposit",
        depositNumber: deposit.depositNumber,
        accountNumber: account.accountNumber,
        principal: money(deposit.principal),
        interestEarned: money(roundMoney(payout - deposit.principal)),
        interestRate: deposit.interestRate,
        rateLabel: deposit.rateLabel,
        tenure: describeTenure(deposit),
        payoutAmount: money(payout),
      });
    } catch (error) {
      console.error("Deposit matured email failed:", error.message);
    }
  }

  return deposit;
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
    depositType: "fixed deposit",
    daysLeft,
    depositNumber: deposit.depositNumber,
    accountNumber: account?.accountNumber ?? "your account",
    principal: money(deposit.principal),
    interestRate: deposit.interestRate,
    rateLabel: deposit.rateLabel,
    maturityAmount: money(deposit.maturityAmount),
    maturityDate: longDate(deposit.maturityDate),
    penaltyPercent,
  });

  deposit.reminderSentAt = new Date();
  await deposit.save();
}

// Credits anything that has reached its maturity date and warns anything that
// is about to. Safe to call as often as you like: each step is recorded.
async function settleFixedDeposits(now = new Date()) {
  const result = { matured: 0, reminded: 0, failed: 0 };

  const due = await FixedDeposit.find({
    status: "active",
    maturityDate: { $lte: now },
  });

  for (const deposit of due) {
    try {
      await matureDeposit(deposit);
      result.matured += 1;
    } catch (error) {
      result.failed += 1;
      console.error(`Maturing ${deposit.depositNumber} failed:`, error.message);
    }
  }

  const config = await InterestRate.findOne({ type: "fixedDeposit" })
    .select("prematureClosurePenaltyPercent")
    .lean();

  const upcoming = await FixedDeposit.find({
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
  REMINDER_DAYS,
  settleFixedDeposits,
  creditAccount,
  describeTenure,
  money,
};
