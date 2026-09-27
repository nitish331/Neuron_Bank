const express = require("express");
const {
  register,
  login,
  verifyLoginCode,
  refreshAccessToken,
  logout,
} = require("../controllers/auth.controller");
const {
  registerValidation,
  loginValidation,
  refreshTokenValidation,
  handleValidationErrors,
} = require("../middleware/auth.validation");
const {
  verifyCodeValidation,
} = require("../middleware/verification.validation");

const router = express.Router();

router.post("/register", registerValidation, handleValidationErrors, register);

router.post("/login", loginValidation, handleValidationErrors, login);

// Same body shape as the signup code check: an email and a 6 digit code.
router.post(
  "/verify-login-code",
  verifyCodeValidation,
  handleValidationErrors,
  verifyLoginCode,
);

router.post(
  "/refresh-token",
  refreshTokenValidation,
  handleValidationErrors,
  refreshAccessToken,
);

// Takes the refresh token, not the access token, so logging out works after it expires.
router.post(
  "/logout",
  refreshTokenValidation,
  handleValidationErrors,
  logout,
);

module.exports = router;
