const express = require("express");
const {
  requestDebitCard,
  listDebitCards,
  sendCardSettingsCode,
  updateCardSettings,
  forgotCardPin,
  resetCardPin,
} = require("../controllers/debitCard.controller");
const { authenticate } = require("../middleware/auth.middleware");
const {
  sendCardOtpValidation,
  updateCardSettingsValidation,
  forgotCardPinValidation,
  resetCardPinValidation,
} = require("../middleware/debitCard.validation");
const { handleValidationErrors } = require("../middleware/auth.validation");

const router = express.Router();

router.get("/debit-cards", authenticate, listDebitCards);

router.post("/debit-cards", authenticate, requestDebitCard);

router.post(
  "/debit-cards/:cardId/send-otp",
  authenticate,
  sendCardOtpValidation,
  handleValidationErrors,
  sendCardSettingsCode,
);

router.patch(
  "/debit-cards/:cardId",
  authenticate,
  updateCardSettingsValidation,
  handleValidationErrors,
  updateCardSettings,
);

router.post(
  "/debit-cards/:cardId/forgot-pin",
  authenticate,
  forgotCardPinValidation,
  handleValidationErrors,
  forgotCardPin,
);

// The link itself is the proof, so this one needs no access token.
router.post(
  "/debit-cards/reset-pin",
  resetCardPinValidation,
  handleValidationErrors,
  resetCardPin,
);

module.exports = router;
