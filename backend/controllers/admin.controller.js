const mongoose = require("mongoose");
const Account = require("../models/account");
const User = require("../models/user");
const LoanRequest = require("../models/loanRequest");
const Transaction = require("../models/transaction");
const { createHttpError } = require("../utils/authUtils");
const { roundMoney, generateReference } = require("../utils/transactionUtils");
const { emiDueDate } = require("../utils/loanMath");
const { sendLoanApprovedEmail, sendLoanRejectedEmail } = require("../utils/mailer");

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

function publicLoanRequest(loan) {
  return {
    id: loan._id,
    amount: loan.amount,
    currency: loan.currency,
    purpose: loan.purpose,
    tenureMonths: loan.tenureMonths,
    monthlyIncome: loan.monthlyIncome,
    status: loan.status,
    interestRate: loan.interestRate ?? null,
    emiAmount: loan.emiAmount ?? null,
    totalPayable: loan.totalPayable ?? null,
    emisPaid: loan.emisPaid ?? 0,
    emisMissed: loan.emisMissed ?? 0,
    isOverdue: Boolean(loan.isOverdue),
    approvedBy: loan.approvedBy ?? null,
    approvedAt: loan.approvedAt ?? null,
    rejectionReason: loan.rejectionReason ?? null,
    createdAt: loan.createdAt,
  };
}

async function approveAccount(req, res, next) {
  let session;

  try {
    session = await mongoose.startSession();
    const { accountId } = req.params;
    let approvedAccount;
    let owner;

    await session.withTransaction(async () => {
      const account = await Account.findById(accountId).session(session);

      if (!account) {
        throw createHttpError(404, "Account not found");
      }

      if (account.status !== "pending") {
        throw createHttpError(
          409,
          `Account is already ${account.status} and cannot be approved`,
        );
      }

      owner = await User.findById(account.user).session(session);

      if (!owner) {
        throw createHttpError(404, "The owner of this account no longer exists");
      }

      if (owner.status === "suspended" || owner.status === "rejected") {
        throw createHttpError(
          422,
          `Cannot approve an account whose owner is ${owner.status}`,
        );
      }

      account.status = "active";
      account.approvedBy = req.user._id;
      account.approvedAt = new Date();
      account.rejectionReason = undefined;
      approvedAccount = await account.save({ session });

      if (owner.status === "pending") {
        owner.status = "active";
        await owner.save({ session });
      }
    });

    return res.status(200).json({
      success: true,
      message: "account approved successfully",
      data: {
        id: approvedAccount._id,
        accountNumber: approvedAccount.accountNumber,
        status: approvedAccount.status,
        balance: approvedAccount.balance,
        currency: approvedAccount.currency,
        approvedBy: approvedAccount.approvedBy,
        approvedAt: approvedAccount.approvedAt,
        ownerName: owner.name,
        ownerEmail: owner.email,
        ownerStatus: owner.status,
      },
    });
  } catch (error) {
    return next(error);
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

async function listLoanRequests(req, res, next) {
  try {
    const status = req.query.status || "pending";
    const page = Number.parseInt(req.query.page, 10) || 1;
    const limit = Number.parseInt(req.query.limit, 10) || 20;

    const filter = status === "all" ? {} : { status };

    // The { status, createdAt } index covers this, oldest first so the queue
    // is worked in the order people applied.
    const [requests, total] = await Promise.all([
      LoanRequest.find(filter)
        .sort({ createdAt: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("user", "name email phoneNumber status")
        .populate("account", "accountNumber status balance")
        .lean(),
      LoanRequest.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "loan requests fetched successfully",
      data: {
        requests: requests.map((loan) => ({
          ...publicLoanRequest(loan),
          applicant: loan.user
            ? {
                id: loan.user._id,
                name: loan.user.name,
                email: loan.user.email,
                phoneNumber: loan.user.phoneNumber,
                status: loan.user.status,
              }
            : null,
          account: loan.account
            ? {
                accountNumber: loan.account.accountNumber,
                status: loan.account.status,
                balance: loan.account.balance,
              }
            : null,
        })),
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

// Shared by both decisions: a request can only be acted on once, and only
// while it is still pending.
async function loadPendingRequest(loanId, session) {
  const loan = await LoanRequest.findById(loanId).session(session);

  if (!loan) {
    throw createHttpError(404, "Loan request not found");
  }

  if (loan.status !== "pending") {
    throw createHttpError(
      409,
      `This loan request was already ${loan.status} and cannot be changed`,
    );
  }

  return loan;
}

async function approveLoanRequest(req, res, next) {
  let session;

  try {
    session = await mongoose.startSession();
    let loan;
    let account;
    let applicant;

    await session.withTransaction(async () => {
      loan = await loadPendingRequest(req.params.loanId, session);

      account = await Account.findById(loan.account).session(session);

      if (!account) {
        throw createHttpError(404, "The account for this request no longer exists");
      }

      if (account.status !== "active") {
        throw createHttpError(
          422,
          `Cannot pay out to an account that is ${account.status}`,
        );
      }

      applicant = await User.findById(loan.user)
        .select("name email status")
        .session(session);

      if (!applicant) {
        throw createHttpError(404, "The applicant no longer exists");
      }

      if (applicant.status === "suspended" || applicant.status === "rejected") {
        throw createHttpError(
          422,
          `Cannot approve a loan for a customer who is ${applicant.status}`,
        );
      }

      // Approving is what pays the money out, so both happen together.
      const credited = await Account.findOneAndUpdate(
        { _id: account._id },
        { $inc: { balance: loan.amount } },
        { returnDocument: "after", session },
      );

      await Transaction.create(
        [
          {
            account: account._id,
            sender: loan.user,
            receiver: loan.user,
            senderAccountNumber: "NEURON BANK LOAN",
            receiverAccountNumber: account.accountNumber,
            type: "credit",
            amount: loan.amount,
            currency: loan.currency,
            balanceAfter: roundMoney(credited.balance),
            reference: generateReference(),
            description: `Loan disbursed for ${loan.purpose}`,
            dateTime: new Date(),
          },
        ],
        { session },
      );

      loan.status = "approved";
      loan.approvedBy = req.user._id;
      loan.approvedAt = new Date();
      loan.rejectionReason = undefined;
      // Repayment is measured from payout, so the first EMI is a month later.
      loan.repaymentStartDate = loan.approvedAt;
      await loan.save({ session });

      account = credited;
    });

    const firstEmi = emiDueDate(loan.repaymentStartDate, 1);

    // The money has landed, so a mail failure must not fail the request.
    try {
      await sendLoanApprovedEmail(applicant.email, {
        name: applicant.name,
        amount: money(loan.amount),
        purpose: loan.purpose,
        tenureMonths: loan.tenureMonths,
        approvedAt: longDate(loan.approvedAt),
        accountNumber: account.accountNumber,
        balance: money(roundMoney(account.balance)),
        interestRate: loan.interestRate,
        emiAmount: money(loan.emiAmount),
        totalPayable: money(loan.totalPayable),
        firstEmiDate: longDate(firstEmi),
      });
    } catch (error) {
      console.error("Loan approved email failed:", error.message);
    }

    return res.status(200).json({
      success: true,
      message: `loan approved and INR ${money(loan.amount)} credited to ${account.accountNumber}`,
      data: {
        request: publicLoanRequest(loan),
        applicant: { name: applicant.name, email: applicant.email },
        accountNumber: account.accountNumber,
        balance: roundMoney(account.balance),
        repayment: {
          emiAmount: loan.emiAmount,
          emisTotal: loan.tenureMonths,
          interestRate: loan.interestRate,
          totalPayable: loan.totalPayable,
          firstEmiDate: firstEmi,
        },
      },
    });
  } catch (error) {
    return next(error);
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

async function rejectLoanRequest(req, res, next) {
  try {
    const reason = req.body.reason.trim();
    const loan = await loadPendingRequest(req.params.loanId);

    const applicant = await User.findById(loan.user).select("name email").lean();

    loan.status = "rejected";
    loan.rejectionReason = reason;
    // Recorded on the same fields, so the audit trail reads the same either way.
    loan.approvedBy = req.user._id;
    loan.approvedAt = new Date();
    await loan.save();

    if (applicant) {
      try {
        await sendLoanRejectedEmail(applicant.email, {
          name: applicant.name,
          amount: money(loan.amount),
          purpose: loan.purpose,
          decidedAt: longDate(loan.approvedAt),
          reason,
        });
      } catch (error) {
        console.error("Loan rejected email failed:", error.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: "loan request rejected",
      data: {
        request: publicLoanRequest(loan),
        applicant: applicant
          ? { name: applicant.name, email: applicant.email }
          : null,
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  approveAccount,
  listLoanRequests,
  approveLoanRequest,
  rejectLoanRequest,
};
