const express = require("express");
const {
  getRates,
  createRecurringDeposit,
  listRecurringDeposits,
  sendCloseCode,
  closeRecurringDeposit,
} = require("../controllers/recurringDeposit.controller");
const { authenticate } = require("../middleware/auth.middleware");
const {
  createRecurringDepositValidation,
  depositIdValidation,
  closeRecurringDepositValidation,
} = require("../middleware/recurringDeposit.validation");
const { handleValidationErrors } = require("../middleware/auth.validation");

const router = express.Router();

// Ahead of the :depositId routes, so "rates" is not read as an id.
router.get("/recurring-deposits/rates", authenticate, getRates);

router.get("/recurring-deposits", authenticate, listRecurringDeposits);

router.post(
  "/recurring-deposits",
  authenticate,
  createRecurringDepositValidation,
  handleValidationErrors,
  createRecurringDeposit,
);

router.post(
  "/recurring-deposits/:depositId/send-otp",
  authenticate,
  depositIdValidation,
  handleValidationErrors,
  sendCloseCode,
);

router.post(
  "/recurring-deposits/:depositId/close",
  authenticate,
  closeRecurringDepositValidation,
  handleValidationErrors,
  closeRecurringDeposit,
);

module.exports = router;
