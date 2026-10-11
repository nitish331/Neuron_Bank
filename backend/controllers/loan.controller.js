const Account = require("../models/account");
const LoanRequest = require("../models/loanRequest");
const InterestRate = require("../models/interestRate");
const { createHttpError } = require("../utils/authUtils");
const { roundMoney } = require("../utils/transactionUtils");
const { findSlab } = require("../utils/fixedDepositMath");
const { ALLOWED_TENURES, buildSchedule } = require("../utils/loanMath");
const { settleLoanEmis, scheduleFor, outstandingOf } = require("../utils/loanSettlement");

const DEFAULT_PAGE_SIZE = 20;

async function loadRateCard() {
  const config = await InterestRate.findOne({ type: "loan" }).lean();

  if (!config || !config.slabs?.length) {
    throw createHttpError(
      503,
      "Loan rates are not configured. Please try again later",
    );
  }

  return config;
}

// Everything the customer needs to see repayment progress.
function repaymentOf(loan) {
  if (loan.status !== "approved" && loan.status !== "repaid") {
    return null;
  }

  const schedule = scheduleFor(loan);
  const nextRow = schedule.rows[loan.emisPaid];

  return {
    emiAmount: loan.emiAmount,
    emisPaid: loan.emisPaid,
    emisTotal: loan.tenureMonths,
    emisMissed: loan.emisMissed,
    amountRepaid: roundMoney(loan.amountRepaid),
    outstanding: outstandingOf(loan),
    nextEmiDate: nextRow ? nextRow.dueDate : null,
    nextEmiAmount: nextRow ? nextRow.amount : null,
    isOverdue: Boolean(loan.isOverdue),
    repaidAt: loan.repaidAt ?? null,
  };
}

function publicLoanRequest(loan, accountNumber) {
  return {
    id: loan._id,
    amount: loan.amount,
    currency: loan.currency,
    purpose: loan.purpose,
    tenureMonths: loan.tenureMonths,
    monthlyIncome: loan.monthlyIncome,
    status: loan.status,
    // Only ever set on a rejection, and the customer needs to read it.
    rejectionReason: loan.rejectionReason ?? null,
    // When the decision was made, whichever way it went.
    decidedAt: loan.approvedAt ?? null,
    interestRate: loan.interestRate ?? null,
    rateLabel: loan.rateLabel ?? null,
    emiAmount: loan.emiAmount ?? null,
    totalPayable: loan.totalPayable ?? null,
    totalInterest: loan.totalInterest ?? null,
    repayment: repaymentOf(loan),
    accountNumber,
    createdAt: loan.createdAt,
  };
}

async function getRates(req, res, next) {
  try {
    const config = await loadRateCard();
    const amount = Number(req.query.amount);
    const preview = Number.isFinite(amount) && amount > 0;

    return res.status(200).json({
      success: true,
      message: "loan rates fetched successfully",
      data: {
        tenures: config.slabs.map((slab) => {
          const months = slab.minMonths;
          const row = {
            months,
            label: slab.label,
            rate: slab.rate,
          };

          // Quoting the EMI up front means the choice is made with real numbers.
          if (preview) {
            const schedule = buildSchedule({
              principal: amount,
              annualRatePercent: slab.rate,
              months,
              startDate: new Date(),
            });

            row.emiAmount = schedule.emi;
            row.totalPayable = schedule.totalPayable;
            row.totalInterest = schedule.totalInterest;
          }

          return row;
        }),
        previewAmount: preview ? roundMoney(amount) : null,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function createLoanRequest(req, res, next) {
  try {
    const { amount, purpose, tenureMonths, monthlyIncome } = req.body;

    const account = await Account.findOne({ user: req.user._id });

    if (!account) {
      throw createHttpError(404, "No account found for the logged in user");
    }

    if (account.status !== "active") {
      throw createHttpError(
        403,
        `Your account is ${account.status} and cannot apply for a loan`,
      );
    }

    const pendingRequest = await LoanRequest.findOne({
      user: req.user._id,
      status: "pending",
    })
      .select("_id")
      .lean();

    if (pendingRequest) {
      throw createHttpError(
        409,
        "You already have a loan request awaiting approval",
      );
    }

    const config = await loadRateCard();
    const slab = findSlab(config.slabs, tenureMonths);

    if (!slab) {
      throw createHttpError(
        422,
        `Choose one of these terms in months: ${ALLOWED_TENURES.join(", ")}`,
      );
    }

    // Priced now, so the rate and EMI cannot move between applying and approval.
    const schedule = buildSchedule({
      principal: amount,
      annualRatePercent: slab.rate,
      months: tenureMonths,
      startDate: new Date(),
    });

    const loanRequest = await LoanRequest.create({
      user: req.user._id,
      account: account._id,
      amount,
      currency: account.currency,
      purpose,
      tenureMonths,
      monthlyIncome,
      status: "pending",
      interestRate: slab.rate,
      rateLabel: slab.label,
      emiAmount: schedule.emi,
      totalPayable: schedule.totalPayable,
      totalInterest: schedule.totalInterest,
    });

    return res.status(201).json({
      success: true,
      message: "loan request submitted successfully",
      data: {
        id: loanRequest._id,
        amount: loanRequest.amount,
        currency: loanRequest.currency,
        purpose: loanRequest.purpose,
        tenureMonths: loanRequest.tenureMonths,
        monthlyIncome: loanRequest.monthlyIncome,
        status: loanRequest.status,
        interestRate: loanRequest.interestRate,
        rateLabel: loanRequest.rateLabel,
        emiAmount: loanRequest.emiAmount,
        totalPayable: loanRequest.totalPayable,
        totalInterest: loanRequest.totalInterest,
        accountNumber: account.accountNumber,
        createdAt: loanRequest.createdAt,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function listLoanRequests(req, res, next) {
  try {
    // Anything due is collected before the list is built, so progress is current.
    await settleLoanEmis();

    const { status } = req.query;
    const page = Number.parseInt(req.query.page, 10) || 1;
    const limit = Number.parseInt(req.query.limit, 10) || DEFAULT_PAGE_SIZE;

    const account = await Account.findOne({ user: req.user._id })
      .select("accountNumber")
      .lean();

    const filter = { user: req.user._id };

    if (status) {
      filter.status = status;
    }

    // Newest first, the way the customer thinks about their own applications.
    const [requests, total] = await Promise.all([
      LoanRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      LoanRequest.countDocuments(filter),
    ]);

    // Counted across everything, not just this page, so the tiles stay right.
    const summaryRows = await LoanRequest.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: "$status",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const summary = summaryRows.reduce(
      (acc, row) => {
        acc[row._id] = { total: roundMoney(row.total), count: row.count };
        return acc;
      },
      {
        pending: { total: 0, count: 0 },
        approved: { total: 0, count: 0 },
        rejected: { total: 0, count: 0 },
      },
    );

    return res.status(200).json({
      success: true,
      message: "loan requests fetched successfully",
      data: {
        requests: requests.map((loan) =>
          publicLoanRequest(loan, account?.accountNumber ?? null),
        ),
        summary,
        // Drives the apply button, matching the one pending rule on create.
        canApply: summary.pending.count === 0,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: page * limit < total,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getRates, createLoanRequest, listLoanRequests };
