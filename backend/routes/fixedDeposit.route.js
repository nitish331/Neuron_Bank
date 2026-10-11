const express = require("express");
const {
  getRates,
  createFixedDeposit,
  listFixedDeposits,
  sendCloseCode,
  closeFixedDeposit,
} = require("../controllers/fixedDeposit.controller");
const { authenticate } = require("../middleware/auth.middleware");
const {
  createFixedDepositValidation,
  depositIdValidation,
  closeFixedDepositValidation,
} = require("../middleware/fixedDeposit.validation");
const { handleValidationErrors } = require("../middleware/auth.validation");

const router = express.Router();

// Ahead of the :depositId routes, so "rates" is not read as an id.
router.get("/fixed-deposits/rates", authenticate, getRates);

router.get("/fixed-deposits", authenticate, listFixedDeposits);

router.post(
  "/fixed-deposits",
  authenticate,
  createFixedDepositValidation,
  handleValidationErrors,
  createFixedDeposit,
);

router.post(
  "/fixed-deposits/:depositId/send-otp",
  authenticate,
  depositIdValidation,
  handleValidationErrors,
  sendCloseCode,
);

router.post(
  "/fixed-deposits/:depositId/close",
  authenticate,
  closeFixedDepositValidation,
  handleValidationErrors,
  closeFixedDeposit,
);

module.exports = router;
