const express = require("express");
const {
  forgotPassword,
  resetPassword,
} = require("../controllers/password.controller");
const {
  forgotPasswordValidation,
  resetPasswordValidation,
} = require("../middleware/password.validation");
const { handleValidationErrors } = require("../middleware/auth.validation");

const router = express.Router();

router.post(
  "/forgot-password",
  forgotPasswordValidation,
  handleValidationErrors,
  forgotPassword,
);

router.post(
  "/reset-password",
  resetPasswordValidation,
  handleValidationErrors,
  resetPassword,
);

module.exports = router;
