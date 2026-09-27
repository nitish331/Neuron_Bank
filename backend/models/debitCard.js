const mongoose = require("mongoose");

const debitCardSchema = new mongoose.Schema(
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
    // Only the last four are stored in the clear, the way a statement shows it.
    last4: {
      type: String,
      required: [true, "Card last four digits are required"],
      match: [/^\d{4}$/, "Last four must be 4 digits"],
    },
    // Encrypted rather than hashed: the customer has to be able to read these
    // back. Never selected by default, so a stray query cannot leak them.
    cardNumberEnc: {
      type: String,
      select: false,
    },
    cvvEnc: {
      type: String,
      select: false,
    },
    pinHash: {
      type: String,
      select: false,
    },
    // Readable flag so the app can tell "no PIN yet" without the hash itself.
    pinSetAt: {
      type: Date,
    },
    cardholderName: {
      type: String,
      required: [true, "Cardholder name is required"],
      trim: true,
      uppercase: true,
    },
    network: {
      type: String,
      enum: ["RUPAY", "VISA", "MASTERCARD"],
      default: "RUPAY",
    },
    expiryMonth: {
      type: Number,
      required: [true, "Expiry month is required"],
      min: [1, "Expiry month must be between 1 and 12"],
      max: [12, "Expiry month must be between 1 and 12"],
    },
    expiryYear: {
      type: Number,
      required: [true, "Expiry year is required"],
    },
    // The exact moment the card stops working, so expiry is one comparison.
    expiresAt: {
      type: Date,
      required: [true, "Expiry date is required"],
    },
    status: {
      type: String,
      enum: ["active", "frozen", "blocked", "expired"],
      default: "active",
    },
    dailyLimit: {
      type: Number,
      default: 25000,
      min: [0, "Daily limit cannot be negative"],
    },
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

debitCardSchema.index({ user: 1, status: 1 });
debitCardSchema.index({ account: 1, createdAt: -1 });

module.exports = mongoose.model("DebitCard", debitCardSchema);
