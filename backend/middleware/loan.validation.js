const { body, query } = require("express-validator");
const { ALLOWED_TENURES } = require("../utils/loanMath");

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
    .isInt()
    .withMessage("Tenure must be a whole number of months")
    .bail()
    .custom((value) => {
      if (!ALLOWED_TENURES.includes(Number(value))) {
        throw new Error(
          `Tenure must be one of these months: ${ALLOWED_TENURES.join(", ")}`,
        );
      }

      return true;
    }),
  body("monthlyIncome")
    .notEmpty()
    .withMessage("Monthly income is required")
    .bail()
    .isFloat({ min: 0, max: 10000000 })
    .withMessage("Monthly income must be a positive amount")
    .toFloat(),
];

const listLoanRequestsValidation = [
  query("status")
    .optional()
    .isIn(["pending", "approved", "rejected"])
    .withMessage("Status must be pending, approved or rejected"),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a whole number of 1 or more"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
];

const loanRatesValidation = [
  query("amount")
    .optional()
    .isFloat({ min: 1 })
    .withMessage("Amount must be a positive number"),
];

module.exports = {
  createLoanRequestValidation,
  listLoanRequestsValidation,
  loanRatesValidation,
};
