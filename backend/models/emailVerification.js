const mongoose = require("mongoose");

const emailVerificationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
    },
    // Keeps a signup code and a login code for the same address independent.
    purpose: {
      type: String,
      enum: ["register", "login", "reset", "card", "cardPin"],
      required: [true, "Purpose is required"],
    },
    // A 6 digit code for the register and login flows, a reset token for reset.
    codeHash: {
      type: String,
      required: [true, "Code hash is required"],
    },
    attempts: {
      type: Number,
      default: 0,
      min: [0, "Attempts cannot be negative"],
    },
    verified: {
      type: Boolean,
      default: false,
    },
    // The record is valid until this time, and MongoDB deletes it afterwards.
    expiresAt: {
      type: Date,
      required: [true, "Expiry is required"],
      index: { expireAfterSeconds: 0 },
    },
  },
  {
    timestamps: true,
  }
);

emailVerificationSchema.index({ email: 1, purpose: 1 }, { unique: true });

module.exports = mongoose.model("EmailVerification", emailVerificationSchema);
