const mongoose = require("mongoose");

const beneficiarySchema = new mongoose.Schema(
  {
    // The customer who saved this payee.
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
    // Kept alongside the reference so a list needs no extra lookup.
    accountNumber: {
      type: String,
      required: [true, "Account number is required"],
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Account holder name is required"],
      trim: true,
    },
    // A disabled payee stays on the list but cannot be paid.
    status: {
      type: String,
      enum: ["active", "disabled"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

// One entry per payee, so the same account cannot be saved twice.
beneficiarySchema.index({ user: 1, account: 1 }, { unique: true });
beneficiarySchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Beneficiary", beneficiarySchema);
