const mongoose = require("mongoose");
const Account = require("../models/account");
const User = require("../models/user");
const LoanRequest = require("../models/loanRequest");
const FixedDeposit = require("../models/fixedDeposit");
const RecurringDeposit = require("../models/recurringDeposit");
const DebitCard = require("../models/debitCard");
const Transaction = require("../models/transaction");
const { createHttpError } = require("../utils/authUtils");
const { roundMoney, generateReference } = require("../utils/transactionUtils");
const { emiDueDate } = require("../utils/loanMath");
const {
  sendLoanApprovedEmail,
  sendLoanRejectedEmail,
  sendAccountRejectedEmail,
  sendAccountApprovedEmail,
  sendAccountSuspendedEmail,
  sendAccountReactivatedEmail,
  sendAccountClosedEmail,
} = require("../utils/mailer");

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

    try {
      await sendAccountApprovedEmail(owner.email, {
        name: owner.name,
        accountNumber: approvedAccount.accountNumber,
        currency: approvedAccount.currency,
        balance: money(approvedAccount.balance),
        approvedAt: longDate(approvedAccount.approvedAt),
      });
    } catch (error) {
      console.error("Account approved email failed:", error.message);
    }

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

function publicAccount(account, owner) {
  return {
    id: account._id,
    accountNumber: account.accountNumber,
    status: account.status,
    balance: account.balance,
    currency: account.currency,
    approvedBy: account.approvedBy ?? null,
    approvedAt: account.approvedAt ?? null,
    rejectionReason: account.rejectionReason ?? null,
    openedAt: account.createdAt,
    owner: owner
      ? {
          id: owner._id,
          name: owner.name,
          email: owner.email,
          phoneNumber: owner.phoneNumber,
          status: owner.status,
          dateOfBirth: owner.dateOfBirth,
          emailVerifiedAt: owner.emailVerifiedAt ?? null,
          joinedAt: owner.createdAt,
        }
      : null,
  };
}

async function listAccounts(req, res, next) {
  try {
    const status = req.query.status || "pending";
    const page = Number.parseInt(req.query.page, 10) || 1;
    const limit = Number.parseInt(req.query.limit, 10) || 20;

    const filter = status === "all" ? {} : { status };

    // Oldest first, so the queue is worked in the order people applied.
    const [accounts, total, counts] = await Promise.all([
      Account.find(filter)
        .sort({ createdAt: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("user", "name email phoneNumber status dateOfBirth emailVerifiedAt createdAt")
        .lean(),
      Account.countDocuments(filter),
      Account.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ]);

    return res.status(200).json({
      success: true,
      message: "accounts fetched successfully",
      data: {
        accounts: accounts.map((account) =>
          publicAccount(account, account.user),
        ),
        // Every status at a glance, so the queue tabs can show their counts.
        statusCounts: counts.reduce(
          (acc, row) => ({ ...acc, [row._id]: row.count }),
          { pending: 0, active: 0, rejected: 0, closed: 0, blocked: 0 },
        ),
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

async function rejectAccount(req, res, next) {
  let session;

  try {
    session = await mongoose.startSession();
    const reason = req.body.reason.trim();
    let rejectedAccount;
    let owner;

    await session.withTransaction(async () => {
      const account = await Account.findById(req.params.accountId).session(session);

      if (!account) {
        throw createHttpError(404, "Account not found");
      }

      // Only a request awaiting review can be turned down.
      if (account.status !== "pending") {
        throw createHttpError(
          409,
          `Account is already ${account.status} and cannot be rejected`,
        );
      }

      owner = await User.findById(account.user).session(session);

      if (!owner) {
        throw createHttpError(404, "The owner of this account no longer exists");
      }

      account.status = "rejected";
      account.rejectionReason = reason;
      account.approvedBy = req.user._id;
      account.approvedAt = new Date();
      rejectedAccount = await account.save({ session });

      // One account per customer, so turning it down turns the person away.
      if (owner.status === "pending") {
        owner.status = "rejected";
        await owner.save({ session });
      }
    });

    try {
      await sendAccountRejectedEmail(owner.email, {
        name: owner.name,
        accountNumber: rejectedAccount.accountNumber,
        decidedAt: longDate(rejectedAccount.approvedAt),
        reason,
      });
    } catch (error) {
      console.error("Account rejected email failed:", error.message);
    }

    return res.status(200).json({
      success: true,
      message: "account request rejected",
      data: { account: publicAccount(rejectedAccount, owner) },
    });
  } catch (error) {
    return next(error);
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

async function listCustomers(req, res, next) {
  try {
    const page = Number.parseInt(req.query.page, 10) || 1;
    const limit = Number.parseInt(req.query.limit, 10) || 20;
    const { status, search } = req.query;

    const filter = { role: "customer" };

    if (status) {
      filter.status = status;
    }

    if (search) {
      // Escaped, so a stray bracket in the box cannot break the query.
      const safe = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(safe, "i");

      filter.$or = [
        { name: pattern },
        { email: pattern },
        { phoneNumber: pattern },
      ];
    }

    const [customers, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("name email phoneNumber status dateOfBirth emailVerifiedAt createdAt")
        .lean(),
      User.countDocuments(filter),
    ]);

    // One extra query for the whole page rather than one per customer.
    const accounts = await Account.find({
      user: { $in: customers.map((customer) => customer._id) },
    })
      .select("user accountNumber status balance currency")
      .lean();

    const byUser = new Map(
      accounts.map((account) => [String(account.user), account]),
    );

    return res.status(200).json({
      success: true,
      message: "customers fetched successfully",
      data: {
        customers: customers.map((customer) => {
          const account = byUser.get(String(customer._id));

          return {
            id: customer._id,
            name: customer.name,
            email: customer.email,
            phoneNumber: customer.phoneNumber,
            status: customer.status,
            dateOfBirth: customer.dateOfBirth,
            emailVerifiedAt: customer.emailVerifiedAt ?? null,
            joinedAt: customer.createdAt,
            account: account
              ? {
                  id: account._id,
                  accountNumber: account.accountNumber,
                  status: account.status,
                  balance: account.balance,
                  currency: account.currency,
                }
              : null,
          };
        }),
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

async function setCustomerStatus(req, res, next) {
  try {
    const { status } = req.body;
    const reason = req.body.reason?.trim();

    const customer = await User.findById(req.params.userId).select(
      "+refreshTokenHash +refreshTokenExpiresAt",
    );

    if (!customer) {
      throw createHttpError(404, "Customer not found");
    }

    // Staff accounts are not managed from the customer screens.
    if (customer.role !== "customer") {
      throw createHttpError(422, "Only customer accounts can be suspended");
    }

    if (customer.status === status) {
      throw createHttpError(409, `This customer is already ${status}`);
    }

    if (status === "suspended" && customer.status !== "active") {
      throw createHttpError(
        409,
        `Only an active customer can be suspended, this one is ${customer.status}`,
      );
    }

    if (status === "active" && customer.status !== "suspended") {
      throw createHttpError(
        409,
        `Only a suspended customer can be reactivated, this one is ${customer.status}`,
      );
    }

    customer.status = status;

    if (status === "suspended") {
      // Ends every session, so the suspension bites immediately.
      customer.refreshTokenHash = undefined;
      customer.refreshTokenExpiresAt = undefined;
    }

    await customer.save();

    const account = await Account.findOne({ user: customer._id })
      .select("accountNumber")
      .lean();

    const values = {
      name: customer.name,
      accountNumber: account?.accountNumber ?? "your account",
      decidedAt: longDate(new Date()),
      reason,
    };

    try {
      if (status === "suspended") {
        await sendAccountSuspendedEmail(customer.email, values);
      } else {
        await sendAccountReactivatedEmail(customer.email, values);
      }
    } catch (error) {
      console.error("Customer status email failed:", error.message);
    }

    return res.status(200).json({
      success: true,
      message:
        status === "suspended"
          ? "customer suspended successfully"
          : "customer reactivated successfully",
      data: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        status: customer.status,
        accountNumber: account?.accountNumber ?? null,
        reason: reason ?? null,
      },
    });
  } catch (error) {
    return next(error);
  }
}

// Nothing may be left behind an account that is about to be shut.
async function assertNothingOutstanding(account) {
  if (account.balance > 0) {
    throw createHttpError(
      422,
      `This account still holds INR ${money(account.balance)}. Empty it before closing`,
    );
  }

  const [fixedDeposits, recurringDeposits, loans] = await Promise.all([
    FixedDeposit.countDocuments({ account: account._id, status: "active" }),
    RecurringDeposit.countDocuments({ account: account._id, status: "active" }),
    LoanRequest.countDocuments({
      account: account._id,
      status: { $in: ["pending", "approved"] },
    }),
  ]);

  if (fixedDeposits || recurringDeposits) {
    throw createHttpError(
      422,
      `This account has ${fixedDeposits + recurringDeposits} running deposit(s). Close them before closing the account`,
    );
  }

  if (loans) {
    throw createHttpError(
      422,
      `This account has ${loans} loan(s) still open. Settle them before closing the account`,
    );
  }
}

async function closeAccount(req, res, next) {
  try {
    const reason = req.body.reason.trim();
    const account = await Account.findById(req.params.accountId);

    if (!account) {
      throw createHttpError(404, "Account not found");
    }

    if (account.status === "closed") {
      throw createHttpError(409, "This account is already closed");
    }

    if (account.status === "pending" || account.status === "rejected") {
      throw createHttpError(
        409,
        `An account that is ${account.status} cannot be closed, decide the application instead`,
      );
    }

    await assertNothingOutstanding(account);

    const owner = await User.findById(account.user).select("name email").lean();
    const closingBalance = roundMoney(account.balance);

    account.status = "closed";
    account.rejectionReason = reason;
    account.approvedBy = req.user._id;
    account.approvedAt = new Date();
    await account.save();

    // A card on a shut account can never work again.
    const cards = await DebitCard.updateMany(
      { account: account._id, status: { $in: ["active", "frozen"] } },
      { status: "blocked" },
    );

    if (owner) {
      try {
        await sendAccountClosedEmail(owner.email, {
          name: owner.name,
          accountNumber: account.accountNumber,
          decidedAt: longDate(account.approvedAt),
          balance: money(closingBalance),
          reason,
        });
      } catch (error) {
        console.error("Account closed email failed:", error.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: "account closed successfully",
      data: {
        account: publicAccount(account, owner),
        cardsBlocked: cards.modifiedCount,
      },
    });
  } catch (error) {
    return next(error);
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
    const [requests, total, counts] = await Promise.all([
      LoanRequest.find(filter)
        .sort({ createdAt: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("user", "name email phoneNumber status")
        .populate("account", "accountNumber status balance")
        .lean(),
      LoanRequest.countDocuments(filter),
      // Every status at a glance, so the queue tabs can show their counts.
      LoanRequest.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
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
        statusCounts: counts.reduce(
          (acc, row) => ({ ...acc, [row._id]: row.count }),
          { pending: 0, approved: 0, rejected: 0, repaid: 0 },
        ),
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
  listAccounts,
  rejectAccount,
  listCustomers,
  setCustomerStatus,
  closeAccount,
  listLoanRequests,
  approveLoanRequest,
  rejectLoanRequest,
};
