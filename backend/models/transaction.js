const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: [true, "Account is required"],
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Sender is required"],
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Receiver is required"],
    },
    senderAccountNumber: {
      type: String,
      required: [true, "Sender account number is required"],
      trim: true,
    },
    receiverAccountNumber: {
      type: String,
      required: [true, "Receiver account number is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: ["debit", "credit"],
      required: [true, "Transaction type is required"],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be greater than zero"],
    },
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true,
    },
    balanceAfter: {
      type: Number,
      required: [true, "Balance after transaction is required"],
      min: [0, "Balance cannot be negative"],
    },
    reference: {
      type: String,
      required: [true, "Reference is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [140, "Description must not exceed 140 characters"],
    },
    status: {
      type: String,
      enum: ["completed", "failed", "reversed"],
      default: "completed",
    },
    dateTime: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

transactionSchema.index({ account: 1, dateTime: -1 });
transactionSchema.index({ reference: 1 });

module.exports = mongoose.model("Transaction", transactionSchema);
