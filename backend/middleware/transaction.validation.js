const { body } = require("express-validator");

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

module.exports = { transferValidation, depositValidation };
