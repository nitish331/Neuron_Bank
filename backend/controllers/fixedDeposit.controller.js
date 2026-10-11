const mongoose = require("mongoose");
const Account = require("../models/account");
const Transaction = require("../models/transaction");
const FixedDeposit = require("../models/fixedDeposit");
const InterestRate = require("../models/interestRate");
const EmailVerification = require("../models/emailVerification");
const generateDepositNumber = require("../utils/generateDepositNumber");
const generateVerificationCode = require("../utils/generateVerificationCode");
const {
  sendDepositBookedEmail,
  sendDepositCloseCodeEmail,
} = require("../utils/mailer");
const { hashToken, tokenHashMatches } = require("../utils/jwt.utils");
const { createHttpError } = require("../utils/authUtils");
const { roundMoney, generateReference } = require("../utils/transactionUtils");
const { quote, valueOn } = require("../utils/fixedDepositMath");
const {
  MAX_ATTEMPTS,
  CODE_EXPIRES_IN_MINUTES,
  minutesFromNow,
} = require("../utils/verificationSettings");
const {
  settleFixedDeposits,
  creditAccount,
  describeTenure,
  money,
} = require("../utils/fixedDepositSettlement");

function longDate(value) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// What closing a deposit right now would be worth, and what it would cost.
function closureBreakdown(deposit, config, now) {
  const gross = valueOn(deposit, now, deposit.compoundingPerYear);
  const penalty = roundMoney(gross * (config.prematureClosurePenaltyPercent / 100));

  return {
    grossAmount: gross,
    penaltyPercent: config.prematureClosurePenaltyPercent,
    penaltyAmount: penalty,
    payoutAmount: roundMoney(gross - penalty),
  };
}

async function loadRateCard() {
  const config = await InterestRate.findOne({ type: "fixedDeposit" }).lean();

  if (!config || !config.slabs?.length) {
    throw createHttpError(
      503,
      "Deposit rates are not configured. Please try again later",
    );
  }

  return config;
}

function publicDeposit(deposit) {
  return {
    id: deposit._id,
    depositNumber: deposit.depositNumber,
    principal: deposit.principal,
    duration: {
      years: deposit.durationYears,
      months: deposit.durationMonths,
      days: deposit.durationDays,
    },
    tenureDays: deposit.tenureDays,
    tenureLabel: describeTenure(deposit),
    interestRate: deposit.interestRate,
    rateLabel: deposit.rateLabel,
    maturityAmount: deposit.maturityAmount,
    interestEarned: roundMoney(deposit.maturityAmount - deposit.principal),
    startDate: deposit.startDate,
    maturityDate: deposit.maturityDate,
    status: deposit.status,
    currency: deposit.currency,
    payoutAmount: deposit.payoutAmount ?? null,
    penaltyAmount: deposit.penaltyAmount ?? 0,
    settledAt: deposit.settledAt ?? null,
  };
}

async function getRates(req, res, next) {
  try {
    const config = await loadRateCard();

    return res.status(200).json({
      success: true,
      message: "deposit rates fetched successfully",
      data: {
        slabs: config.slabs,
        prematureClosurePenaltyPercent: config.prematureClosurePenaltyPercent,
        compoundingPerYear: config.compoundingPerYear,
        minMonths: config.slabs[0].minMonths,
        maxMonths: config.slabs[config.slabs.length - 1].maxMonths,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function createFixedDeposit(req, res, next) {
  let session;

  try {
    const principal = roundMoney(Number(req.body.amount));
    const duration = {
      years: Number(req.body.years) || 0,
      months: Number(req.body.months) || 0,
      days: Number(req.body.days) || 0,
    };

    const config = await loadRateCard();
    const startDate = new Date();

    const priced = quote({
      principal,
      duration,
      slabs: config.slabs,
      startDate,
      compoundingPerYear: config.compoundingPerYear,
    });

    if (!priced.slab) {
      const min = config.slabs[0].minMonths;
      const max = config.slabs[config.slabs.length - 1].maxMonths;

      throw createHttpError(
        422,
        `Deposits run from ${min} months to ${max / 12} years. Please choose a duration in that range`,
      );
    }

    session = await mongoose.startSession();
    let deposit;
    let senderBalance;
    let bookedAccountNumber;

    await session.withTransaction(async () => {
      const account = await Account.findOne({ user: req.user._id }).session(session);

      if (!account) {
        throw createHttpError(404, "No account found for the logged in user");
      }

      if (account.status !== "active") {
        throw createHttpError(
          403,
          `Your account is ${account.status} and cannot open a deposit`,
        );
      }

      // Conditional debit, so two requests cannot spend the same balance.
      const debited = await Account.findOneAndUpdate(
        { _id: account._id, balance: { $gte: principal } },
        { $inc: { balance: -principal } },
        { returnDocument: "after", session },
      );

      if (!debited) {
        throw createHttpError(
          400,
          "Insufficient balance to open this deposit",
        );
      }

      [deposit] = await FixedDeposit.create(
        [
          {
            user: req.user._id,
            account: account._id,
            depositNumber: generateDepositNumber(),
            principal,
            durationYears: duration.years,
            durationMonths: duration.months,
            durationDays: duration.days,
            tenureDays: priced.tenureDays,
            interestRate: priced.slab.rate,
            rateLabel: priced.slab.label,
            compoundingPerYear: config.compoundingPerYear,
            maturityAmount: priced.maturityAmount,
            startDate,
            maturityDate: priced.maturityDate,
            currency: account.currency,
          },
        ],
        { session },
      );

      await Transaction.create(
        [
          {
            account: account._id,
            sender: req.user._id,
            receiver: req.user._id,
            senderAccountNumber: account.accountNumber,
            receiverAccountNumber: deposit.depositNumber,
            type: "debit",
            amount: principal,
            currency: account.currency,
            balanceAfter: roundMoney(debited.balance),
            reference: generateReference(),
            description: `Fixed deposit ${deposit.depositNumber} opened`,
            dateTime: startDate,
          },
        ],
        { session },
      );

      senderBalance = roundMoney(debited.balance);
      bookedAccountNumber = account.accountNumber;
    });

    // The deposit is already open, so a mail failure must not fail the request.
    try {
      await sendDepositBookedEmail(req.user.email, {
        name: req.user.name,
        accountNumber: bookedAccountNumber,
        depositNumber: deposit.depositNumber,
        principal: money(deposit.principal),
        tenure: describeTenure(deposit),
        interestRate: deposit.interestRate,
        rateLabel: deposit.rateLabel,
        maturityAmount: money(deposit.maturityAmount),
        maturityDate: longDate(deposit.maturityDate),
        penaltyPercent: config.prematureClosurePenaltyPercent,
      });
    } catch (error) {
      console.error("Deposit booked email failed:", error.message);
    }

    return res.status(201).json({
      success: true,
      message: "fixed deposit opened successfully",
      data: { deposit: publicDeposit(deposit), balance: senderBalance },
    });
  } catch (error) {
    return next(error);
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

async function listFixedDeposits(req, res, next) {
  try {
    // Anything already due is credited before the list is built, so a customer
    // never sees a deposit sitting past its maturity date.
    await settleFixedDeposits();

    const deposits = await FixedDeposit.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    const totals = deposits.reduce(
      (acc, deposit) => {
        if (deposit.status === "active") {
          acc.activeCount += 1;
          acc.activePrincipal = roundMoney(acc.activePrincipal + deposit.principal);
          acc.expectedMaturity = roundMoney(acc.expectedMaturity + deposit.maturityAmount);
        }

        return acc;
      },
      { activeCount: 0, activePrincipal: 0, expectedMaturity: 0 },
    );

    return res.status(200).json({
      success: true,
      message: "fixed deposits fetched successfully",
      data: {
        deposits: deposits.map(publicDeposit),
        total: deposits.length,
        ...totals,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function findOwnDeposit(depositId, userId) {
  const deposit = await FixedDeposit.findOne({ _id: depositId, user: userId });

  if (!deposit) {
    throw createHttpError(404, "Fixed deposit not found");
  }

  return deposit;
}

async function sendCloseCode(req, res, next) {
  try {
    const deposit = await findOwnDeposit(req.params.depositId, req.user._id);

    if (deposit.status !== "active") {
      throw createHttpError(409, `This deposit is already ${deposit.status}`);
    }

    const now = new Date();

    if (deposit.maturityDate <= now) {
      throw createHttpError(
        409,
        "This deposit has reached its maturity date and will be paid out in full. No code is needed",
      );
    }

    const config = await loadRateCard();
    const breakdown = closureBreakdown(deposit, config, now);
    const code = generateVerificationCode();

    // One record per address, so asking for a new code replaces the old one.
    await EmailVerification.findOneAndUpdate(
      { email: req.user.email, purpose: "deposit" },
      {
        email: req.user.email,
        purpose: "deposit",
        // Tied to the deposit, so a code cannot close a different one.
        codeHash: hashToken(`${deposit._id}:${code}`),
        attempts: 0,
        verified: false,
        expiresAt: minutesFromNow(CODE_EXPIRES_IN_MINUTES),
      },
      { upsert: true },
    );

    await sendDepositCloseCodeEmail(req.user.email, {
      name: req.user.name,
      depositType: "fixed deposit",
      depositNumber: deposit.depositNumber,
      code,
      grossAmount: money(breakdown.grossAmount),
      penaltyPercent: breakdown.penaltyPercent,
      penaltyAmount: money(breakdown.penaltyAmount),
      payoutAmount: money(breakdown.payoutAmount),
      maturityAmount: money(deposit.maturityAmount),
      maturityDate: longDate(deposit.maturityDate),
      amountGivenUp: money(
        roundMoney(deposit.maturityAmount - breakdown.payoutAmount),
      ),
      expiresInMinutes: CODE_EXPIRES_IN_MINUTES,
    });

    return res.status(200).json({
      success: true,
      message: "confirmation code sent to your email",
      data: {
        depositId: deposit._id,
        // Shown up front, so the decision is made with the numbers in view.
        ...breakdown,
        expiresInMinutes: CODE_EXPIRES_IN_MINUTES,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function consumeCode(email, depositId, code) {
  const verification = await EmailVerification.findOne({
    email,
    purpose: "deposit",
  });

  // MongoDB removes expired records on a delay, so check the time as well.
  const isUsable = verification && verification.expiresAt > new Date();

  if (!isUsable) {
    throw createHttpError(
      400,
      "The code is invalid or has expired. Please request a new one",
    );
  }

  if (verification.attempts >= MAX_ATTEMPTS) {
    await verification.deleteOne();
    throw createHttpError(
      429,
      "Too many incorrect attempts. Please request a new code",
    );
  }

  if (!tokenHashMatches(`${depositId}:${code}`, verification.codeHash)) {
    verification.attempts += 1;
    await verification.save();
    throw createHttpError(
      400,
      "The code is invalid or has expired. Please request a new one",
    );
  }

  // Used up, so the same code cannot close a second deposit.
  await verification.deleteOne();
}

async function closeFixedDeposit(req, res, next) {
  try {
    const deposit = await findOwnDeposit(req.params.depositId, req.user._id);

    if (deposit.status !== "active") {
      throw createHttpError(409, `This deposit is already ${deposit.status}`);
    }

    const now = new Date();
    const config = await loadRateCard();

    // Past its date but not yet swept, so pay it in full rather than penalise.
    if (deposit.maturityDate <= now) {
      await settleFixedDeposits(now);

      const settled = await FixedDeposit.findById(deposit._id).lean();

      return res.status(200).json({
        success: true,
        message: "this deposit had already matured and was paid out in full",
        data: { deposit: publicDeposit(settled) },
      });
    }

    // Only checked once the deposit is known to be closeable, so a refusal
    // above never burns the customer's code.
    await consumeCode(req.user.email, deposit._id, req.body.code);

    const { grossAmount: gross, penaltyAmount: penalty, payoutAmount: payout } =
      closureBreakdown(deposit, config, now);

    const account = await creditAccount({
      deposit,
      amount: payout,
      description: `Fixed deposit ${deposit.depositNumber} closed early`,
    });

    deposit.status = "closed";
    deposit.settledAt = now;
    deposit.payoutAmount = payout;
    deposit.penaltyAmount = penalty;
    await deposit.save();

    return res.status(200).json({
      success: true,
      message: `deposit closed. INR ${payout.toLocaleString("en-IN", { minimumFractionDigits: 2 })} credited after a ${config.prematureClosurePenaltyPercent}% charge`,
      data: {
        deposit: publicDeposit(deposit),
        breakdown: {
          principal: deposit.principal,
          interestAccrued: roundMoney(gross - deposit.principal),
          grossAmount: gross,
          penaltyPercent: config.prematureClosurePenaltyPercent,
          penaltyAmount: penalty,
          creditedAmount: payout,
        },
        balance: roundMoney(account.balance),
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getRates,
  createFixedDeposit,
  listFixedDeposits,
  sendCloseCode,
  closeFixedDeposit,
};
