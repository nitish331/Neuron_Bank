const Account = require("../models/account");
const LoanRequest = require("../models/loanRequest");
const { createHttpError } = require("../utils/authUtils");

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

    const loanRequest = await LoanRequest.create({
      user: req.user._id,
      account: account._id,
      amount,
      currency: account.currency,
      purpose,
      tenureMonths,
      monthlyIncome,
      status: "pending",
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
        accountNumber: account.accountNumber,
        createdAt: loanRequest.createdAt,
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { createLoanRequest };
