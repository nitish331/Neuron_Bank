const Account = require("../models/account");
const Transaction = require("../models/transaction");
const buildStatementPdf = require("../utils/statementPdf");
const { sendStatementEmail } = require("../utils/mailer");
const { createHttpError } = require("../utils/authUtils");
const { roundMoney } = require("../utils/transactionUtils");

// A statement is not paged, so this stops one request pulling a whole history.
const MAX_ROWS = 2000;

function shortDate(value) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function buildFilter(accountId, { type, startDate, endDate }) {
  const filter = { account: accountId, status: "completed" };

  if (type) {
    filter.type = type;
  }

  if (startDate || endDate) {
    filter.dateTime = {};

    if (startDate) {
      filter.dateTime.$gte = new Date(startDate);
    }

    if (endDate) {
      // A bare date means the whole of that day, not midnight.
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.dateTime.$lte = end;
    }
  }

  return filter;
}

function describeRange({ startDate, endDate }, transactions) {
  if (startDate && endDate) {
    return `${shortDate(startDate)} to ${shortDate(endDate)}`;
  }

  if (startDate) {
    return `${shortDate(startDate)} to date`;
  }

  if (endDate) {
    return `Up to ${shortDate(endDate)}`;
  }

  if (transactions.length === 0) {
    return "All transactions";
  }

  const oldest = transactions[transactions.length - 1].dateTime;

  return `${shortDate(oldest)} to ${shortDate(transactions[0].dateTime)}`;
}

// Rows arrive newest first, so the oldest one carries the opening position.
function summarise(transactions, account) {
  let totalCredits = 0;
  let totalDebits = 0;

  transactions.forEach((transaction) => {
    if (transaction.type === "credit") {
      totalCredits += transaction.amount;
    } else {
      totalDebits += transaction.amount;
    }
  });

  const oldest = transactions[transactions.length - 1];
  const openingBalance = oldest
    ? oldest.type === "credit"
      ? oldest.balanceAfter - oldest.amount
      : oldest.balanceAfter + oldest.amount
    : account.balance;

  // The newest row's balance, so a filtered view still closes on its own figures.
  const closingBalance = transactions.length ? transactions[0].balanceAfter : account.balance;

  return {
    totalCredits: roundMoney(totalCredits),
    totalDebits: roundMoney(totalDebits),
    net: roundMoney(totalCredits - totalDebits),
    openingBalance: roundMoney(openingBalance),
    closingBalance: roundMoney(closingBalance),
    count: transactions.length,
  };
}

async function gatherStatement(req) {
  const account = await Account.findOne({ user: req.user._id }).lean();

  if (!account) {
    throw createHttpError(404, "No account found for the logged in user");
  }

  const filter = buildFilter(account._id, req.query);

  const transactions = await Transaction.find(filter)
    .sort({ dateTime: -1 })
    .limit(MAX_ROWS)
    .lean();

  return {
    user: req.user,
    account,
    transactions,
    summary: summarise(transactions, account),
    range: { label: describeRange(req.query, transactions) },
  };
}

function fileName() {
  const stamp = new Date().toISOString().slice(0, 10);

  return `neuron-bank-statement-${stamp}.pdf`;
}

async function downloadStatement(req, res, next) {
  try {
    const statement = await gatherStatement(req);
    const pdf = await buildStatementPdf(statement);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName()}"`,
    );
    res.setHeader("Content-Length", pdf.length);
    // The browser has to read the name off the header on a cross origin fetch.
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

    return res.status(200).end(pdf);
  } catch (error) {
    return next(error);
  }
}

async function emailStatement(req, res, next) {
  try {
    const statement = await gatherStatement(req);
    const pdf = await buildStatementPdf(statement);

    await sendStatementEmail({
      email: req.user.email,
      name: req.user.name,
      accountNumber: statement.account.accountNumber,
      period: statement.range.label,
      count: statement.summary.count,
      fileName: fileName(),
      pdf,
    });

    return res.status(200).json({
      success: true,
      message: `statement sent to ${req.user.email}`,
      data: {
        period: statement.range.label,
        transactions: statement.summary.count,
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { downloadStatement, emailStatement };
