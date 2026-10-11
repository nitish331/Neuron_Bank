const Account = require("../models/account");
const Transaction = require("../models/transaction");
const LoanRequest = require("../models/loanRequest");
const FixedDeposit = require("../models/fixedDeposit");
const RecurringDeposit = require("../models/recurringDeposit");
const { createHttpError } = require("../utils/authUtils");
const { roundMoney } = require("../utils/transactionUtils");

const DEFAULT_MONTHS = 12;

// Buckets must follow the customer's own calendar, not UTC, or a late evening
// transaction on the last of the month lands in the next one.
const TIMEZONE = process.env.ANALYTICS_TIMEZONE || "Asia/Kolkata";

function monthKeyInZone(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const lookup = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

  return `${lookup.year}-${lookup.month}`;
}

// Plain year and month arithmetic, so no timezone or daylight saving maths.
function shiftMonthKey(key, offset) {
  const [year, month] = key.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + offset, 1));

  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthKeyToDate(key) {
  const [year, month] = key.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, 1));
}

// Null when there is nothing to compare against, matching the dashboard tiles.
function percentChange(current, previous) {
  if (!previous) {
    return null;
  }

  return Math.round(((current - previous) / previous) * 100);
}

function emptyBucket() {
  return { credits: 0, debits: 0, creditCount: 0, debitCount: 0 };
}

// Turns { _id: { month, type }, total, count } rows into one bucket per month.
function foldRows(rows, pick = (row) => row._id.month) {
  return rows.reduce((acc, row) => {
    const key = pick(row);

    if (!acc[key]) {
      acc[key] = emptyBucket();
    }

    if (row._id.type === "credit") {
      acc[key].credits = roundMoney(row.total);
      acc[key].creditCount = row.count;
    } else {
      acc[key].debits = roundMoney(row.total);
      acc[key].debitCount = row.count;
    }

    return acc;
  }, {});
}

async function userAnalytics(req, res, next) {
  try {
    const months = Number.parseInt(req.query.months, 10) || DEFAULT_MONTHS;

    const account = await Account.findOne({ user: req.user._id }).lean();

    if (!account) {
      throw createHttpError(404, "No account found for the logged in user");
    }

    const currentMonth = monthKeyInZone(new Date());

    // One extra month so the delta always has a previous month to compare to.
    const span = Math.max(months, 2);
    const monthKeys = Array.from({ length: span }, (unused, index) =>
      shiftMonthKey(currentMonth, index - (span - 1)),
    );

    // A day of slack covers the offset between the timezone and stored UTC.
    const windowStart = new Date(monthKeyToDate(monthKeys[0]).getTime() - 864e5);
    const completed = { account: account._id, status: "completed" };

    const [monthlyRows, overallRows, loanRows, fdRows, rdRows] = await Promise.all([
      Transaction.aggregate([
        { $match: { ...completed, dateTime: { $gte: windowStart } } },
        {
          $group: {
            _id: {
              month: {
                $dateToString: {
                  format: "%Y-%m",
                  date: "$dateTime",
                  timezone: TIMEZONE,
                },
              },
              type: "$type",
            },
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),
      Transaction.aggregate([
        { $match: completed },
        {
          $group: {
            _id: { type: "$type" },
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),
      LoanRequest.aggregate([
        { $match: { user: req.user._id, status: { $in: ["pending", "approved"] } } },
        {
          $group: {
            _id: "$status",
            total: { $sum: "$amount" },
            // What is still owed, which falls as the EMIs are collected.
            outstanding: {
              $sum: {
                $max: [
                  0,
                  {
                    $subtract: [
                      { $ifNull: ["$totalPayable", "$amount"] },
                      { $ifNull: ["$amountRepaid", 0] },
                    ],
                  },
                ],
              },
            },
            count: { $sum: 1 },
          },
        },
      ]),
      // Money currently locked away, plus what it is on track to pay back.
      FixedDeposit.aggregate([
        { $match: { user: req.user._id, status: "active" } },
        {
          $group: {
            _id: null,
            principal: { $sum: "$principal" },
            maturityValue: { $sum: "$maturityAmount" },
            count: { $sum: 1 },
          },
        },
      ]),
      RecurringDeposit.aggregate([
        { $match: { user: req.user._id, status: "active" } },
        {
          $group: {
            _id: null,
            deposited: { $sum: "$totalDeposited" },
            monthlyCommitment: { $sum: "$installmentAmount" },
            projectedMaturity: { $sum: "$maturityAmount" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const buckets = foldRows(monthlyRows);
    const overall = foldRows(overallRows, () => "all").all || emptyBucket();

    // Zero filled and oldest first, so an idle month is a gap in the chart.
    const monthly = monthKeys.slice(-months).map((month) => ({
      month,
      ...(buckets[month] || emptyBucket()),
    }));

    const thisMonth = buckets[currentMonth] || emptyBucket();
    const lastMonth = buckets[shiftMonthKey(currentMonth, -1)] || emptyBucket();

    const fd = fdRows[0] || {};
    const fixedDeposits = {
      activeCount: fd.count || 0,
      principal: roundMoney(fd.principal || 0),
      maturityValue: roundMoney(fd.maturityValue || 0),
    };

    const rd = rdRows[0] || {};
    const recurringDeposits = {
      activeCount: rd.count || 0,
      deposited: roundMoney(rd.deposited || 0),
      monthlyCommitment: roundMoney(rd.monthlyCommitment || 0),
      // What they pay out if every remaining instalment lands on time.
      projectedMaturity: roundMoney(rd.projectedMaturity || 0),
    };

    const loans = loanRows.reduce(
      (acc, row) => {
        if (row._id === "approved") {
          acc.total = roundMoney(row.total);
          acc.outstanding = roundMoney(row.outstanding);
          acc.activeCount = row.count;
        } else {
          acc.pendingTotal = roundMoney(row.total);
          acc.pendingCount = row.count;
        }

        return acc;
      },
      {
        total: 0,
        outstanding: 0,
        activeCount: 0,
        pendingTotal: 0,
        pendingCount: 0,
      },
    );

    return res.status(200).json({
      success: true,
      message: "user analytics fetched successfully",
      data: {
        currency: account.currency,
        balance: roundMoney(account.balance),
        overall: {
          totalCredits: overall.credits,
          totalDebits: overall.debits,
          net: roundMoney(overall.credits - overall.debits),
          creditCount: overall.creditCount,
          debitCount: overall.debitCount,
        },
        thisMonth,
        lastMonth,
        deltas: {
          credits: percentChange(thisMonth.credits, lastMonth.credits),
          debits: percentChange(thisMonth.debits, lastMonth.debits),
        },
        monthly,
        loans,
        fixedDeposits,
        recurringDeposits,
        // Deposits are the only thing invested so far, so this is the total of
        // the two rather than a figure of its own.
        investments: {
          total: roundMoney(fixedDeposits.principal + recurringDeposits.deposited),
          count: fixedDeposits.activeCount + recurringDeposits.activeCount,
          maturityValue: roundMoney(
            fixedDeposits.maturityValue + recurringDeposits.projectedMaturity,
          ),
        },
        // Names the figures no endpoint backs yet, so the UI can label them.
        // Every figure above is now backed by real records.
        placeholders: [],
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { userAnalytics };
