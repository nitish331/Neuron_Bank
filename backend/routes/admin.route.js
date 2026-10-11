const express = require("express");
const {
  approveAccount,
  listLoanRequests,
  approveLoanRequest,
  rejectLoanRequest,
} = require("../controllers/admin.controller");
const { authenticate, requireRole } = require("../middleware/auth.middleware");
const {
  approveAccountValidation,
  loanIdValidation,
  listLoanRequestsValidation,
  rejectLoanRequestValidation,
} = require("../middleware/admin.validation");
const { handleValidationErrors } = require("../middleware/auth.validation");

const router = express.Router();

// Everything here is staff only.
router.use("/admin", authenticate, requireRole("admin"));

router.patch(
  "/admin/accounts/:accountId/approve",
  approveAccountValidation,
  handleValidationErrors,
  approveAccount,
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

module.exports = router;
