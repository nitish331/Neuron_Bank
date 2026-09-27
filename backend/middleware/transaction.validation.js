const { body, query } = require("express-validator");

function amountValidation() {
  return body("amount")
    .notEmpty()
    .withMessage("Amount is required")
    .bail()
    .isFloat({ gt: 0 })
    .withMessage("Amount must be greater than zero")
    .bail()
    .custom((value) => {
      if (!/^\d+(\.\d{1,2})?$/.test(String(value).trim())) {
        throw new Error("Amount must have at most 2 decimal places");
      }

      return true;
    })
    .bail()
    .isFloat({ max: 1000000 })
    .withMessage("Amount must not exceed 1000000 per transaction")
    .toFloat();
}

function descriptionValidation() {
  return body("description")
    .optional()
    .isString()
    .withMessage("Description must be text")
    .bail()
    .trim()
    .isLength({ max: 140 })
    .withMessage("Description must not exceed 140 characters");
}

const transferValidation = [
  body("receiverAccountNumber")
    .isString()
    .withMessage("Receiver account number must be text")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Receiver account number is required")
    .bail()
    .isLength({ min: 6, max: 32 })
    .withMessage("Receiver account number must be between 6 and 32 characters")
    .bail()
    .matches(/^[A-Za-z0-9]+$/)
    .withMessage("Receiver account number must be alphanumeric")
    .toUpperCase(),
  amountValidation(),
  descriptionValidation(),
];

const depositValidation = [amountValidation(), descriptionValidation()];

const listTransactionsValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a whole number of 1 or more")
    .toInt(),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100")
    .toInt(),
  query("type")
    .optional()
    .isIn(["debit", "credit"])
    .withMessage("Type must be either debit or credit"),
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid date"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid date")
    .bail()
    .custom((value, { req }) => {
      const { startDate } = req.query;

      if (startDate && new Date(value) < new Date(startDate)) {
        throw new Error("End date cannot be before the start date");
      }

      return true;
    }),
];

module.exports = {
  transferValidation,
  depositValidation,
  listTransactionsValidation,
};
