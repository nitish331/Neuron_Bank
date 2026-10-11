const { body, param } = require("express-validator");

// Two actions need a code, and the code is tied to the one the customer asked for.
const OTP_ACTIONS = ["update", "delete"];

function beneficiaryIdValidation() {
  return param("beneficiaryId").isMongoId().withMessage("Beneficiary id is not valid");
}

function codeValidation() {
  return body("code")
    .isString()
    .withMessage("Code must be text")
    .bail()
    .trim()
    .matches(/^\d{6}$/)
    .withMessage("Code must be 6 digits");
}

const addBeneficiaryValidation = [
  body("accountNumber")
    .isString()
    .withMessage("Account number must be text")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Account number is required")
    .bail()
    .isLength({ min: 6, max: 32 })
    .withMessage("Account number must be between 6 and 32 characters")
    .bail()
    .matches(/^[A-Za-z0-9]+$/)
    .withMessage("Account number must be alphanumeric")
    .toUpperCase(),
  body("name")
    .isString()
    .withMessage("Account holder name must be text")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Account holder name is required")
    .bail()
    .isLength({ min: 2, max: 100 })
    .withMessage("Account holder name must be between 2 and 100 characters"),
];

const sendBeneficiaryOtpValidation = [
  beneficiaryIdValidation(),
  body("action")
    .optional()
    .isIn(OTP_ACTIONS)
    .withMessage(`Action must be one of ${OTP_ACTIONS.join(", ")}`),
];

const updateBeneficiaryValidation = [
  beneficiaryIdValidation(),
  codeValidation(),
  body("status")
    .isIn(["active", "disabled"])
    .withMessage("Status must be either active or disabled"),
];

const deleteBeneficiaryValidation = [beneficiaryIdValidation(), codeValidation()];

module.exports = {
  OTP_ACTIONS,
  addBeneficiaryValidation,
  sendBeneficiaryOtpValidation,
  updateBeneficiaryValidation,
  deleteBeneficiaryValidation,
};
