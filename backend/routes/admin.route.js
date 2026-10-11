const express = require("express");
const {
  approveAccount,
  listAccounts,
  rejectAccount,
  listCustomers,
  setCustomerStatus,
  closeAccount,
  listLoanRequests,
  approveLoanRequest,
  rejectLoanRequest,
} = require("../controllers/admin.controller");
const {
  listInterestRates,
  updateInterestRates,
} = require("../controllers/interestRate.controller");
const { authenticate, requireRole } = require("../middleware/auth.middleware");
const {
  approveAccountValidation,
  listAccountsValidation,
  rejectAccountValidation,
  listCustomersValidation,
  setCustomerStatusValidation,
  closeAccountValidation,
  loanIdValidation,
  listLoanRequestsValidation,
  rejectLoanRequestValidation,
} = require("../middleware/admin.validation");
const {
  updateInterestRatesValidation,
} = require("../middleware/interestRate.validation");
const { handleValidationErrors } = require("../middleware/auth.validation");

const router = express.Router();

// Everything here is staff only.
router.use("/admin", authenticate, requireRole("admin"));

router.get(
  "/admin/accounts",
  listAccountsValidation,
  handleValidationErrors,
  listAccounts,
);

router.patch(
  "/admin/accounts/:accountId/approve",
  approveAccountValidation,
  handleValidationErrors,
  approveAccount,
);

router.patch(
  "/admin/accounts/:accountId/reject",
  rejectAccountValidation,
  handleValidationErrors,
  rejectAccount,
);

router.patch(
  "/admin/accounts/:accountId/close",
  closeAccountValidation,
  handleValidationErrors,
  closeAccount,
);

router.patch(
  "/admin/customers/:userId/status",
  setCustomerStatusValidation,
  handleValidationErrors,
  setCustomerStatus,
);

router.get(
  "/admin/customers",
  listCustomersValidation,
  handleValidationErrors,
  listCustomers,
);

router.get(
  "/admin/loan-requests",
  listLoanRequestsValidation,
  handleValidationErrors,
  listLoanRequests,
);

router.patch(
  "/admin/loan-requests/:loanId/approve",
  loanIdValidation,
  handleValidationErrors,
  approveLoanRequest,
);

router.patch(
  "/admin/loan-requests/:loanId/reject",
  rejectLoanRequestValidation,
  handleValidationErrors,
  rejectLoanRequest,
);

router.get("/admin/interest-rates", listInterestRates);

// Rates only: the tenure bands are the product, not an editable setting.
router.patch(
  "/admin/interest-rates/:type",
  updateInterestRatesValidation,
  handleValidationErrors,
  updateInterestRates,
);

module.exports = router;
