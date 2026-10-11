const mongoose = require("mongoose");

// One document holds the whole rate table, so rates live in a single place.
const interestRateSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      default: "fixedDeposit",
      unique: true,
      trim: true,
    },
    slabs: [
      {
        _id: false,
        label: { type: String, required: true, trim: true },
        // The stated tenure in months. Start is inclusive, end is not, so one
        // band's end is the next one's start and nothing falls between them.
        minMonths: { type: Number, required: true, min: 1 },
        maxMonths: { type: Number, required: true },
        rate: { type: Number, required: true, min: 0, max: 100 },
      },
    ],
    // Charged on the payout when a deposit is closed before it matures.
    prematureClosurePenaltyPercent: {
      type: Number,
      default: 1,
      min: 0,
      max: 100,
    },
    compoundingPerYear: {
      type: Number,
      default: 4,
      min: 1,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("InterestRate", interestRateSchema);
