const { body, param } = require("express-validator");

const MIN_DAILY_LIMIT = 1000;
const MAX_DAILY_LIMIT = 200000;

// Customers may freeze and unfreeze; expired is reached by time, never by hand.
const CUSTOMER_STATUSES = ["active", "frozen", "blocked"];

function cardIdValidation() {
  return param("cardId").isMongoId().withMessage("Card id is not valid");
}

function pinValidation(field = "pin") {
  return body(field)
    .isString()
    .withMessage("PIN must be text")
    .bail()
    .trim()
    .matches(/^\d{4}$/)
    .withMessage("PIN must be 4 digits")
    .bail()
    .custom((value) => {
      if (/^(\d)\1{3}$/.test(value)) {
        throw new Error("PIN must not be the same digit four times");
      }

      if ("0123456789".includes(value) || "9876543210".includes(value)) {
        throw new Error("PIN must not be four digits in a row");
      }

      return true;
    });
}

const sendCardOtpValidation = [cardIdValidation()];

const updateCardSettingsValidation = [
  cardIdValidation(),
  body("code")
    .isString()
    .withMessage("Code must be text")
    .bail()
    .trim()
    .matches(/^\d{6}$/)
    .withMessage("Code must be 6 digits"),
  body("dailyLimit")
    .optional()
    .isInt({ min: MIN_DAILY_LIMIT, max: MAX_DAILY_LIMIT })
    .withMessage(
      `Daily limit must be between ${MIN_DAILY_LIMIT} and ${MAX_DAILY_LIMIT}`
    ),
  body("status")
    .optional()
    .isIn(CUSTOMER_STATUSES)
    .withMessage(`Status must be one of ${CUSTOMER_STATUSES.join(", ")}`),
  pinValidation().optional(),
  // Guards against a confirmed OTP being spent on a request that changes nothing.
  body().custom((value, { req }) => {
    const { dailyLimit, status, pin } = req.body;

    if (dailyLimit === undefined && status === undefined && pin === undefined) {
      throw new Error("Provide a daily limit, status or PIN to update");
    }

    return true;
  }),
];

const forgotCardPinValidation = [cardIdValidation()];

const resetCardPinValidation = [
  body("token")
    .isString()
    .withMessage("Reset token must be text")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Reset token is required"),
  pinValidation(),
  body("confirmPin")
    .notEmpty()
    .withMessage("Please confirm your new PIN")
    .bail()
    .custom((value, { req }) => {
      if (value !== req.body.pin) {
        throw new Error("PINs do not match");
      }

      return true;
    }),
];

module.exports = {
  pinValidation,
  sendCardOtpValidation,
  updateCardSettingsValidation,
  forgotCardPinValidation,
  resetCardPinValidation,
};
