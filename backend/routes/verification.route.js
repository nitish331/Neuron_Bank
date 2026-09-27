const express = require("express");
const {
  sendVerificationCode,
  verifyEmailCode,
} = require("../controllers/verification.controller");
const {
  sendCodeValidation,
  verifyCodeValidation,
} = require("../middleware/verification.validation");
const { handleValidationErrors } = require("../middleware/auth.validation");

const router = express.Router();

router.post(
  "/send-verification-code",
  sendCodeValidation,
  handleValidationErrors,
  sendVerificationCode,
);

router.post(
  "/verify-email-code",
  verifyCodeValidation,
  handleValidationErrors,
  verifyEmailCode,
);

module.exports = router;
