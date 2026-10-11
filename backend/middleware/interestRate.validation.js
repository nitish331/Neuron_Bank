const { body, param } = require("express-validator");

// The three rate cards the console can edit.
const RATE_TYPES = ["fixedDeposit", "recurringDeposit", "loan"];

const rateTypeValidation = [
  param("type")
    .isIn(RATE_TYPES)
    .withMessage(`Type must be one of ${RATE_TYPES.join(", ")}`),
];

// Only the rate is editable. Tenure bands are the product, not a setting, so
// no label, minMonths or maxMonths is accepted here at all.
const updateInterestRatesValidation = [
  ...rateTypeValidation,
  body("rates")
    .isArray({ min: 1 })
    .withMessage("Provide at least one rate to update"),
  body("rates.*.label")
    .isString()
    .withMessage("Each rate must name the slab it belongs to")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Slab label is required"),
  body("rates.*.rate")
    .notEmpty()
    .withMessage("Rate is required")
    .bail()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Rate must be between 0 and 100")
    .bail()
    .custom((value) => {
      if (!/^\d+(\.\d{1,2})?$/.test(String(value).trim())) {
        throw new Error("Rate must have at most 2 decimal places");
      }

      return true;
    }),
];

module.exports = {
  RATE_TYPES,
  rateTypeValidation,
  updateInterestRatesValidation,
};
