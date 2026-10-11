const mongoose = require("mongoose");

const recurringDepositSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    // The savings account instalments are taken from, and the payout goes to.
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: [true, "Account is required"],
    },
    depositNumber: {
      type: String,
      required: [true, "Deposit number is required"],
      unique: true,
      trim: true,
    },
    installmentAmount: {
      type: Number,
      required: [true, "Monthly instalment is required"],
      min: [1, "Instalment must be greater than zero"],
    },
    totalInstallments: {
      type: Number,
      required: [true, "Number of instalments is required"],
      min: [1, "There must be at least one instalment"],
    },
    durationYears: { type: Number, default: 0, min: 0 },
    durationMonths: { type: Number, default: 0, min: 0 },
    tenureDays: {
      type: Number,
      required: [true, "Tenure is required"],
    },
    // Copied in at booking, so a later change to the rate card never alters a
    // deposit that is already running.
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
    // What it pays if every instalment lands on time. The real payout is worked
    // out from the instalments actually received.
    maturityAmount: {
      type: Number,
      required: [true, "Maturity amount is required"],
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    maturityDate: {
      type: Date,
      required: [true, "Maturity date is required"],
    },
    // Every instalment that was actually collected, so interest can be worked
    // out exactly even when a month was missed.
    payments: [
      {
        _id: false,
        installmentNumber: { type: Number, required: true },
        amount: { type: Number, required: true },
        paidAt: { type: Date, required: true },
      },
    ],
    installmentsPaid: { type: Number, default: 0, min: 0 },
    missedInstallments: { type: Number, default: 0, min: 0 },
    totalDeposited: { type: Number, default: 0, min: 0 },
    // When the next automatic debit is attempted.
    nextInstallmentDate: {
      type: Date,
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
    reminderSentAt: { type: Date },
    settledAt: { type: Date },
    payoutAmount: { type: Number },
    penaltyAmount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

recurringDepositSchema.index({ user: 1, createdAt: -1 });
// Drives the sweep that collects instalments, matures deposits and reminds.
recurringDepositSchema.index({ status: 1, nextInstallmentDate: 1 });
recurringDepositSchema.index({ status: 1, maturityDate: 1 });

module.exports = mongoose.model("RecurringDeposit", recurringDepositSchema);
