const { body, param, query } = require("express-validator");

const approveAccountValidation = [
  param("accountId")
    .trim()
    .notEmpty()
    .withMessage("Account id is required")
    .bail()
    .isMongoId()
    .withMessage("Account id must be a valid id"),
];

const loanIdValidation = [
  param("loanId")
    .trim()
    .notEmpty()
    .withMessage("Loan request id is required")
    .bail()
    .isMongoId()
    .withMessage("Loan request id must be a valid id"),
];

const listLoanRequestsValidation = [
  query("status")
    .optional()
    .isIn(["pending", "approved", "rejected", "all"])
    .withMessage("Status must be pending, approved, rejected or all"),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a whole number of 1 or more"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
];

// A rejection is useless to the customer without a reason, so it is required.
const rejectLoanRequestValidation = [
  ...loanIdValidation,
  body("reason")
    .isString()
    .withMessage("Reason must be text")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("A reason is required when rejecting a loan request")
    .bail()
    .isLength({ min: 5, max: 300 })
    .withMessage("Reason must be between 5 and 300 characters"),
];

module.exports = {
  approveAccountValidation,
  loanIdValidation,
  listLoanRequestsValidation,
  rejectLoanRequestValidation,
};
