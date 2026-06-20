const express = require("express");
const {
  register,
  login,
  refreshAccessToken,
} = require("../controllers/auth.controller");
const {
  registerValidation,
  loginValidation,
  refreshTokenValidation,
  handleValidationErrors,
} = require("../middleware/auth.validation");

const router = express.Router();

router.post("/register", registerValidation, handleValidationErrors, register);

router.post("/login", loginValidation, handleValidationErrors, login);

router.post(
  "/refresh-token",
  refreshTokenValidation,
  handleValidationErrors,
  refreshAccessToken,
);

module.exports = router;
