const InterestRate = require("../models/interestRate");
const { createHttpError } = require("../utils/authUtils");
const { RATE_TYPES } = require("../middleware/interestRate.validation");

function publicRateCard(card) {
  return {
    type: card.type,
    slabs: card.slabs.map((slab) => ({
      label: slab.label,
      minMonths: slab.minMonths,
      maxMonths: slab.maxMonths,
      rate: slab.rate,
    })),
    prematureClosurePenaltyPercent: card.prematureClosurePenaltyPercent,
    compoundingPerYear: card.compoundingPerYear,
    updatedAt: card.updatedAt,
  };
}

async function listInterestRates(req, res, next) {
  try {
    const cards = await InterestRate.find({ type: { $in: RATE_TYPES } }).lean();

    // Keyed by type, so the console can render its three tabs directly.
    const rateCards = RATE_TYPES.reduce((acc, type) => {
      const card = cards.find((item) => item.type === type);
      return { ...acc, [type]: card ? publicRateCard(card) : null };
    }, {});

    return res.status(200).json({
      success: true,
      message: "interest rates fetched successfully",
      data: { rateCards },
    });
  } catch (error) {
    return next(error);
  }
}

async function updateInterestRates(req, res, next) {
  try {
    const { type } = req.params;
    const { rates } = req.body;

    const card = await InterestRate.findOne({ type });

    if (!card) {
      throw createHttpError(404, `No ${type} rate card is configured`);
    }

    const byLabel = new Map(card.slabs.map((slab) => [slab.label, slab]));
    const unknown = rates.filter((row) => !byLabel.has(row.label.trim()));

    if (unknown.length) {
      throw createHttpError(
        400,
        `No slab named "${unknown[0].label}" exists on this rate card`,
      );
    }

    const changed = [];

    rates.forEach((row) => {
      const slab = byLabel.get(row.label.trim());
      const next = Number(row.rate);

      if (slab.rate !== next) {
        changed.push({ label: slab.label, from: slab.rate, to: next });
        // Only the rate moves; the tenure band it belongs to is untouched.
        slab.rate = next;
      }
    });

    if (!changed.length) {
      throw createHttpError(409, "These rates already match what is published");
    }

    await card.save();

    return res.status(200).json({
      success: true,
      message: `${changed.length} rate${changed.length === 1 ? "" : "s"} updated`,
      data: { rateCard: publicRateCard(card), changed },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { listInterestRates, updateInterestRates };
