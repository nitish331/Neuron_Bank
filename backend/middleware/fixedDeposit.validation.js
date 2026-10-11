const { body, param } = require("express-validator");

const MIN_PRINCIPAL = 1000;
const MAX_PRINCIPAL = 10000000;

function wholeNumber(field, max, label) {
  return body(field)
    .optional()
    .isInt({ min: 0, max })
    .withMessage(`${label} must be a whole number between 0 and ${max}`);
}

const createFixedDepositValidation = [
  body("amount")
    .notEmpty()
    .withMessage("Amount is required")
    .bail()
    .isFloat({ min: MIN_PRINCIPAL, max: MAX_PRINCIPAL })
    .withMessage(
      `Amount must be between ${MIN_PRINCIPAL} and ${MAX_PRINCIPAL}`,
    )
    .bail()
    .custom((value) => {
      if (!/^\d+(\.\d{1,2})?$/.test(String(value).trim())) {
        throw new Error("Amount must have at most 2 decimal places");
      }

      return true;
    }),
  wholeNumber("years", 5, "Years"),
  wholeNumber("months", 59, "Months"),
  wholeNumber("days", 364, "Days"),
  // The slab lookup decides whether the total is allowed; this only catches zero.
  body().custom((value, { req }) => {
    const { years, months, days } = req.body;

    if (!Number(years) && !Number(months) && !Number(days)) {
      throw new Error("Choose a duration in years, months or days");
    }

    return true;
  }),
];

const depositIdValidation = [
  param("depositId").isMongoId().withMessage("Deposit id is not valid"),
];

const closeFixedDepositValidation = [
  ...depositIdValidation,
  body("code")
    .isString()
    .withMessage("Code must be text")
    .bail()
    .trim()
    .matches(/^\d{6}$/)
    .withMessage("Code must be 6 digits"),
];

module.exports = {
  MIN_PRINCIPAL,
  MAX_PRINCIPAL,
  createFixedDepositValidation,
  depositIdValidation,
  closeFixedDepositValidation,
};
