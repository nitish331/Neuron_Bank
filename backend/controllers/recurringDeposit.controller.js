const mongoose = require("mongoose");
const Account = require("../models/account");
const Transaction = require("../models/transaction");
const RecurringDeposit = require("../models/recurringDeposit");
const InterestRate = require("../models/interestRate");
const EmailVerification = require("../models/emailVerification");
const generateDepositNumber = require("../utils/generateDepositNumber");
const generateVerificationCode = require("../utils/generateVerificationCode");
const {
  sendRecurringDepositBookedEmail,
  sendDepositCloseCodeEmail,
} = require("../utils/mailer");
const { hashToken, tokenHashMatches } = require("../utils/jwt.utils");
const { createHttpError } = require("../utils/authUtils");
const { roundMoney, generateReference } = require("../utils/transactionUtils");
const { findSlab, addDuration } = require("../utils/fixedDepositMath");
const { projectMaturity, valueOfPayments } = require("../utils/recurringDepositMath");
const { creditAccount, money } = require("../utils/fixedDepositSettlement");
const {
  MAX_ATTEMPTS,
  CODE_EXPIRES_IN_MINUTES,
  minutesFromNow,
} = require("../utils/verificationSettings");
const {
  DEPOSIT_TYPE,
  settleRecurringDeposits,
  describeTenure,
  longDate,
} = require("../utils/recurringDepositSettlement");

async function loadRateCard() {
  const config = await InterestRate.findOne({ type: "recurringDeposit" }).lean();

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
    installmentAmount: deposit.installmentAmount,
    totalInstallments: deposit.totalInstallments,
    installmentsPaid: deposit.installmentsPaid,
    missedInstallments: deposit.missedInstallments,
    totalDeposited: deposit.totalDeposited,
    duration: { years: deposit.durationYears, months: deposit.durationMonths },
    tenureLabel: describeTenure(deposit),
    interestRate: deposit.interestRate,
    rateLabel: deposit.rateLabel,
    projectedMaturityAmount: deposit.maturityAmount,
    startDate: deposit.startDate,
    maturityDate: deposit.maturityDate,
    nextInstallmentDate: deposit.nextInstallmentDate ?? null,
    status: deposit.status,
    currency: deposit.currency,
    payoutAmount: deposit.payoutAmount ?? null,
    penaltyAmount: deposit.penaltyAmount ?? 0,
    settledAt: deposit.settledAt ?? null,
  };
}

// What closing right now would be worth, from the instalments actually paid.
function closureBreakdown(deposit, config, now) {
  const gross = valueOfPayments(
    deposit.payments,
    now,
    deposit.interestRate,
    deposit.compoundingPerYear,
  );
  const penalty = roundMoney(gross * (config.prematureClosurePenaltyPercent / 100));

  return {
    grossAmount: gross,
    penaltyPercent: config.prematureClosurePenaltyPercent,
    penaltyAmount: penalty,
    payoutAmount: roundMoney(gross - penalty),
  };
}

async function findOwnDeposit(depositId, userId) {
  const deposit = await RecurringDeposit.findOne({
    _id: depositId,
    user: userId,
  });

  if (!deposit) {
    throw createHttpError(404, "Recurring deposit not found");
  }

  return deposit;
}

async function getRates(req, res, next) {
  try {
    const config = await loadRateCard();

    return res.status(200).json({
      success: true,
      message: "recurring deposit rates fetched successfully",
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

async function createRecurringDeposit(req, res, next) {
  let session;

  try {
    const installmentAmount = roundMoney(Number(req.body.installmentAmount));
    const years = Number(req.body.years) || 0;
    const months = Number(req.body.months) || 0;
    const totalInstallments = years * 12 + months;

    const config = await loadRateCard();
    const slab = findSlab(config.slabs, totalInstallments);

    if (!slab) {
      const min = config.slabs[0].minMonths;
      const max = config.slabs[config.slabs.length - 1].maxMonths;

      throw createHttpError(
        422,
        `Recurring deposits run from ${min} months to ${max / 12} years. Please choose a term in that range`,
      );
    }

    const startDate = new Date();
    const projection = projectMaturity({
      installmentAmount,
      totalInstallments,
      rate: slab.rate,
      startDate,
      compoundingPerYear: config.compoundingPerYear,
    });

    session = await mongoose.startSession();
    let deposit;
    let balance;
    let accountNumber;

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

      // The first instalment is taken straight away, so the deposit starts paid.
      const debited = await Account.findOneAndUpdate(
        { _id: account._id, balance: { $gte: installmentAmount } },
        { $inc: { balance: -installmentAmount } },
        { returnDocument: "after", session },
      );

      if (!debited) {
        throw createHttpError(
          400,
          "Insufficient balance for the first instalment",
        );
      }

      [deposit] = await RecurringDeposit.create(
        [
          {
            user: req.user._id,
            account: account._id,
            depositNumber: generateDepositNumber("RD"),
            installmentAmount,
            totalInstallments,
            durationYears: years,
            durationMonths: months,
            tenureDays: projection.tenureDays,
            interestRate: slab.rate,
            rateLabel: slab.label,
            compoundingPerYear: config.compoundingPerYear,
            maturityAmount: projection.maturityAmount,
            startDate,
            maturityDate: projection.maturityDate,
            payments: [
              { installmentNumber: 1, amount: installmentAmount, paidAt: startDate },
            ],
            installmentsPaid: 1,
            totalDeposited: installmentAmount,
            nextInstallmentDate: addDuration(startDate, { months: 1 }),
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
            amount: installmentAmount,
            currency: account.currency,
            balanceAfter: roundMoney(debited.balance),
            reference: generateReference(),
            description: `Recurring deposit ${deposit.depositNumber} instalment 1`,
            dateTime: startDate,
          },
        ],
        { session },
      );

      balance = roundMoney(debited.balance);
      accountNumber = account.accountNumber;
    });

    // The deposit is already open, so a mail failure must not fail the request.
    try {
      await sendRecurringDepositBookedEmail(req.user.email, {
        name: req.user.name,
        accountNumber,
        depositNumber: deposit.depositNumber,
        installmentAmount: money(installmentAmount),
        totalInstallments,
        tenure: describeTenure(deposit),
        interestRate: slab.rate,
        rateLabel: slab.label,
        totalDeposited: money(projection.totalDeposited),
        maturityAmount: money(projection.maturityAmount),
        maturityDate: longDate(projection.maturityDate),
        nextInstallmentDate: longDate(deposit.nextInstallmentDate),
        penaltyPercent: config.prematureClosurePenaltyPercent,
      });
    } catch (error) {
      console.error("Recurring deposit booked email failed:", error.message);
    }

    return res.status(201).json({
      success: true,
      message: "recurring deposit opened successfully",
      data: { deposit: publicDeposit(deposit), balance },
    });
  } catch (error) {
    return next(error);
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

async function listRecurringDeposits(req, res, next) {
  try {
    // Instalments and maturities are brought up to date before the list is
    // built, so the figures on screen are never stale.
    await settleRecurringDeposits();

    const deposits = await RecurringDeposit.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    const totals = deposits.reduce(
      (acc, deposit) => {
        if (deposit.status === "active") {
          acc.activeCount += 1;
          acc.monthlyCommitment = roundMoney(
            acc.monthlyCommitment + deposit.installmentAmount,
          );
          acc.totalDeposited = roundMoney(acc.totalDeposited + deposit.totalDeposited);
        }

        return acc;
      },
      { activeCount: 0, monthlyCommitment: 0, totalDeposited: 0 },
    );

    return res.status(200).json({
      success: true,
      message: "recurring deposits fetched successfully",
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
      depositType: DEPOSIT_TYPE,
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

  await verification.deleteOne();
}

async function closeRecurringDeposit(req, res, next) {
  try {
    const deposit = await findOwnDeposit(req.params.depositId, req.user._id);

    if (deposit.status !== "active") {
      throw createHttpError(409, `This deposit is already ${deposit.status}`);
    }

    const now = new Date();
    const config = await loadRateCard();

    // Past its date but not yet swept, so pay it in full rather than penalise.
    if (deposit.maturityDate <= now) {
      await settleRecurringDeposits(now);

      const settled = await RecurringDeposit.findById(deposit._id).lean();

      return res.status(200).json({
        success: true,
        message: "this deposit had already matured and was paid out in full",
        data: { deposit: publicDeposit(settled) },
      });
    }

    // Only checked once the deposit is known to be closeable, so a refusal
    // above never burns the customer's code.
    await consumeCode(req.user.email, deposit._id, req.body.code);

    const breakdown = closureBreakdown(deposit, config, now);

    const account = await creditAccount({
      deposit,
      amount: breakdown.payoutAmount,
      description: `Recurring deposit ${deposit.depositNumber} closed early`,
    });

    deposit.status = "closed";
    deposit.settledAt = now;
    deposit.payoutAmount = breakdown.payoutAmount;
    deposit.penaltyAmount = breakdown.penaltyAmount;
    // No more instalments are taken once it is closed.
    deposit.nextInstallmentDate = null;
    await deposit.save();

    return res.status(200).json({
      success: true,
      message: `deposit closed. INR ${breakdown.payoutAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })} credited after a ${breakdown.penaltyPercent}% charge`,
      data: {
        deposit: publicDeposit(deposit),
        breakdown: {
          installmentsPaid: deposit.installmentsPaid,
          totalDeposited: deposit.totalDeposited,
          interestAccrued: roundMoney(breakdown.grossAmount - deposit.totalDeposited),
          grossAmount: breakdown.grossAmount,
          penaltyPercent: breakdown.penaltyPercent,
          penaltyAmount: breakdown.penaltyAmount,
          creditedAmount: breakdown.payoutAmount,
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
  createRecurringDeposit,
  listRecurringDeposits,
  sendCloseCode,
  closeRecurringDeposit,
};
