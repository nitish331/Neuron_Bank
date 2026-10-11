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

const ACCOUNT_STATUSES = ["pending", "active", "rejected", "closed", "blocked"];

function pagingValidation() {
  return [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a whole number of 1 or more"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
  ];
}

const listAccountsValidation = [
  query("status")
    .optional()
    .isIn([...ACCOUNT_STATUSES, "all"])
    .withMessage(`Status must be one of ${ACCOUNT_STATUSES.join(", ")} or all`),
  ...pagingValidation(),
];

// A rejection is useless to the customer without a reason, so it is required.
const rejectAccountValidation = [
  ...approveAccountValidation,
  body("reason")
    .isString()
    .withMessage("Reason must be text")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("A reason is required when rejecting an account")
    .bail()
    .isLength({ min: 5, max: 300 })
    .withMessage("Reason must be between 5 and 300 characters"),
];

const listCustomersValidation = [
  query("status")
    .optional()
    .isIn(["pending", "active", "suspended", "rejected"])
    .withMessage("Status must be pending, active, suspended or rejected"),
  query("search")
    .optional()
    .isString()
    .withMessage("Search must be text")
    .bail()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Search must not exceed 100 characters"),
  ...pagingValidation(),
];

function reasonValidation(action) {
  return body("reason")
    .isString()
    .withMessage("Reason must be text")
    .bail()
    .trim()
    .notEmpty()
    .withMessage(`A reason is required when ${action}`)
    .bail()
    .isLength({ min: 5, max: 300 })
    .withMessage("Reason must be between 5 and 300 characters");
}

const setCustomerStatusValidation = [
  param("userId").isMongoId().withMessage("Customer id must be a valid id"),
  body("status")
    .isIn(["active", "suspended"])
    .withMessage("Status must be either active or suspended"),
  // Only a suspension has to be explained; lifting one does not.
  body("reason")
    .if(body("status").equals("suspended"))
    .isString()
    .withMessage("Reason must be text")
    .bail()
    .trim()
    .isLength({ min: 5, max: 300 })
    .withMessage("Reason must be between 5 and 300 characters"),
];

const closeAccountValidation = [
  ...approveAccountValidation,
  reasonValidation("closing an account"),
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
  listAccountsValidation,
  rejectAccountValidation,
  listCustomersValidation,
  setCustomerStatusValidation,
  closeAccountValidation,
  loanIdValidation,
  listLoanRequestsValidation,
  rejectLoanRequestValidation,
};
