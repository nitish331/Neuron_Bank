const { body } = require("express-validator");
const { emailValidation } = require("./auth.validation");

// Reuses emailValidation so the email is normalized exactly the same way here
// as it is during registration, otherwise the two would not match.
const sendCodeValidation = [emailValidation()];

const verifyCodeValidation = [
  emailValidation(),
  body("code")
    .isString()
    .withMessage("Code must be text")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Code is required")
    .bail()
    .matches(/^\d{6}$/)
    .withMessage("Code must be 6 digits"),
];

module.exports = { sendCodeValidation, verifyCodeValidation };
