const { body } = require("express-validator");

const createLoanRequestValidation = [
  body("amount")
    .notEmpty()
    .withMessage("Loan amount is required")
    .bail()
    .isFloat({ min: 1000, max: 10000000 })
    .withMessage("Loan amount must be between 1000 and 10000000")
    .bail()
    .custom((value) => {
      if (!/^\d+(\.\d{1,2})?$/.test(String(value).trim())) {
        throw new Error("Loan amount must have at most 2 decimal places");
      }

      return true;
    })
    .toFloat(),
  body("purpose")
    .isString()
    .withMessage("Purpose must be text")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Purpose is required")
    .bail()
    .isLength({ min: 3, max: 200 })
    .withMessage("Purpose must be between 3 and 200 characters"),
  body("tenureMonths")
    .notEmpty()
    .withMessage("Tenure is required")
    .bail()
    .isInt({ min: 1, max: 360 })
    .withMessage("Tenure must be a whole number between 1 and 360 months")
    .toInt(),
  body("monthlyIncome")
    .notEmpty()
    .withMessage("Monthly income is required")
    .bail()
    .isFloat({ min: 0, max: 10000000 })
    .withMessage("Monthly income must be a positive amount")
    .toFloat(),
];

module.exports = { createLoanRequestValidation };
