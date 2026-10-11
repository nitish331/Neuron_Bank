const mongoose = require("mongoose");

const loanRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: [true, "Account is required"],
    },
    amount: {
      type: Number,
      required: [true, "Loan amount is required"],
      min: [1000, "Loan amount must be at least 1000"],
    },
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true,
    },
    purpose: {
      type: String,
      required: [true, "Purpose is required"],
      trim: true,
      maxlength: [200, "Purpose must not exceed 200 characters"],
    },
    tenureMonths: {
      type: Number,
      required: [true, "Tenure is required"],
      min: [1, "Tenure must be at least 1 month"],
      max: [360, "Tenure must not exceed 360 months"],
    },
    monthlyIncome: {
      type: Number,
      required: [true, "Monthly income is required"],
      min: [0, "Monthly income cannot be negative"],
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "repaid"],
      default: "pending",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    // Priced when the customer applies, so the EMI they agreed to never moves.
    interestRate: {
      type: Number,
      min: 0,
    },
    rateLabel: {
      type: String,
      trim: true,
    },
    emiAmount: {
      type: Number,
      min: 0,
    },
    totalPayable: {
      type: Number,
      min: 0,
    },
    totalInterest: {
      type: Number,
      min: 0,
    },
    // Repayment starts the day the loan is approved and paid out.
    repaymentStartDate: {
      type: Date,
    },
    lastEmiDate: {
      type: Date,
    },
    emisPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    emisMissed: {
      type: Number,
      default: 0,
      min: 0,
    },
    amountRepaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Set while an instalment is overdue, cleared when the arrears are taken.
    isOverdue: {
      type: Boolean,
      default: false,
    },
    repaidAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

loanRequestSchema.index({ status: 1, createdAt: -1 });
// Drives the sweep that collects instalments.
loanRequestSchema.index({ status: 1, repaymentStartDate: 1 });

loanRequestSchema.index(
  { user: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);

module.exports = mongoose.model("LoanRequest", loanRequestSchema);
