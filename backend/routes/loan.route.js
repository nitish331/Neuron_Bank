const express = require("express");
const {
  getRates,
  createLoanRequest,
  listLoanRequests,
} = require("../controllers/loan.controller");
const { authenticate } = require("../middleware/auth.middleware");
const {
  createLoanRequestValidation,
  listLoanRequestsValidation,
  loanRatesValidation,
} = require("../middleware/loan.validation");
const { handleValidationErrors } = require("../middleware/auth.validation");

const router = express.Router();

// Ahead of the list route, so "rates" is not read as a filter.
router.get(
  "/loan-requests/rates",
  authenticate,
  loanRatesValidation,
  handleValidationErrors,
  getRates,
);

// Readable whatever the account status, unlike applying for a new one.
router.get(
  "/loan-requests",
  authenticate,
  listLoanRequestsValidation,
  handleValidationErrors,
  listLoanRequests,
);

router.post(
  "/loan-requests",
  authenticate,
  createLoanRequestValidation,
  handleValidationErrors,
  createLoanRequest,
);

module.exports = router;
