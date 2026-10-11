const { body, param } = require("express-validator");

const MIN_INSTALLMENT = 500;
const MAX_INSTALLMENT = 1000000;

const createRecurringDepositValidation = [
  body("installmentAmount")
    .notEmpty()
    .withMessage("Monthly instalment is required")
    .bail()
    .isFloat({ min: MIN_INSTALLMENT, max: MAX_INSTALLMENT })
    .withMessage(
      `Monthly instalment must be between ${MIN_INSTALLMENT} and ${MAX_INSTALLMENT}`,
    )
    .bail()
    .custom((value) => {
      if (!/^\d+(\.\d{1,2})?$/.test(String(value).trim())) {
        throw new Error("Monthly instalment must have at most 2 decimal places");
      }

      return true;
    }),
  // Instalments are monthly, so the term is whole months with no stray days.
  body("years")
    .optional()
    .isInt({ min: 0, max: 5 })
    .withMessage("Years must be a whole number between 0 and 5"),
  body("months")
    .optional()
    .isInt({ min: 0, max: 59 })
    .withMessage("Months must be a whole number between 0 and 59"),
  body().custom((value, { req }) => {
    if (!Number(req.body.years) && !Number(req.body.months)) {
      throw new Error("Choose a term in years or months");
    }

    return true;
  }),
];

const depositIdValidation = [
  param("depositId").isMongoId().withMessage("Deposit id is not valid"),
];

const closeRecurringDepositValidation = [
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
  MIN_INSTALLMENT,
  MAX_INSTALLMENT,
  createRecurringDepositValidation,
  depositIdValidation,
  closeRecurringDepositValidation,
};
