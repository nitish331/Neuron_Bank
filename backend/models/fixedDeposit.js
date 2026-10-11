const mongoose = require("mongoose");

const fixedDepositSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    // The savings account the money came from, and goes back to.
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: [true, "Account is required"],
    },
    // A deposit is an account in its own right, so it carries its own number.
    depositNumber: {
      type: String,
      required: [true, "Deposit number is required"],
      unique: true,
      trim: true,
    },
    principal: {
      type: Number,
      required: [true, "Principal is required"],
      min: [1, "Principal must be greater than zero"],
    },
    // Kept as chosen, so the statement can say "1 year 6 months".
    durationYears: { type: Number, default: 0, min: 0 },
    durationMonths: { type: Number, default: 0, min: 0 },
    durationDays: { type: Number, default: 0, min: 0 },
    tenureDays: {
      type: Number,
      required: [true, "Tenure is required"],
      min: [1, "Tenure must be at least a day"],
    },
    // Rate and compounding are copied in at booking, so a later change to the
    // rate card never alters a deposit that is already running.
    interestRate: {
      type: Number,
      required: [true, "Interest rate is required"],
      min: [0, "Interest rate cannot be negative"],
    },
    rateLabel: {
      type: String,
      trim: true,
    },
    compoundingPerYear: {
      type: Number,
      default: 4,
      min: [1, "Compounding must happen at least once a year"],
    },
    maturityAmount: {
      type: Number,
      required: [true, "Maturity amount is required"],
      min: [0, "Maturity amount cannot be negative"],
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    maturityDate: {
      type: Date,
      required: [true, "Maturity date is required"],
    },
    status: {
      type: String,
      enum: ["active", "matured", "closed"],
      default: "active",
    },
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true,
    },
    // Set once the five day warning has gone out, so it is never sent twice.
    reminderSentAt: {
      type: Date,
    },
    // What actually reached the account, and when.
    settledAt: {
      type: Date,
    },
    payoutAmount: {
      type: Number,
    },
    penaltyAmount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

fixedDepositSchema.index({ user: 1, createdAt: -1 });
// Drives the sweep that matures deposits and sends the reminders.
fixedDepositSchema.index({ status: 1, maturityDate: 1 });

module.exports = mongoose.model("FixedDeposit", fixedDepositSchema);
