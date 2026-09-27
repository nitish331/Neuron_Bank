const { body } = require("express-validator");
const { emailValidation, strongPasswordValidation } = require("./auth.validation");

const forgotPasswordValidation = [emailValidation()];

const resetPasswordValidation = [
  body("token")
    .isString()
    .withMessage("Reset token must be text")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Reset token is required"),
  strongPasswordValidation(),
  body("confirmPassword")
    .notEmpty()
    .withMessage("Please confirm your new password")
    .bail()
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Passwords do not match");
      }

      return true;
    }),
];

module.exports = { forgotPasswordValidation, resetPasswordValidation };
