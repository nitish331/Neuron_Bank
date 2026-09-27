const express = require("express");
const {
  transfer,
  deposit,
  listTransactions,
} = require("../controllers/transaction.controller");
const { authenticate } = require("../middleware/auth.middleware");
const {
  transferValidation,
  depositValidation,
  listTransactionsValidation,
} = require("../middleware/transaction.validation");
const { handleValidationErrors } = require("../middleware/auth.validation");

const router = express.Router();

router.post(
  "/transfer",
  authenticate,
  transferValidation,
  handleValidationErrors,
  transfer,
);

router.post(
  "/deposit",
  authenticate,
  depositValidation,
  handleValidationErrors,
  deposit,
);

// History stays readable even when the account is not active, unlike sending money.
router.get(
  "/transactions",
  authenticate,
  listTransactionsValidation,
  handleValidationErrors,
  listTransactions,
);

module.exports = router;
