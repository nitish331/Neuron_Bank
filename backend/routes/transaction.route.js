const express = require("express");
const { transfer, deposit } = require("../controllers/transaction.controller");
const { authenticate } = require("../middleware/auth.middleware");
const {
  transferValidation,
  depositValidation,
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

module.exports = router;
