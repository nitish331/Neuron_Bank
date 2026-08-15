const express = require("express");
const { approveAccount } = require("../controllers/admin.controller");
const { authenticate, requireRole } = require("../middleware/auth.middleware");
const { approveAccountValidation } = require("../middleware/admin.validation");
const { handleValidationErrors } = require("../middleware/auth.validation");

const router = express.Router();

router.patch(
  "/admin/accounts/:accountId/approve",
  authenticate,
  requireRole("admin"),
  approveAccountValidation,
  handleValidationErrors,
  approveAccount,
);

module.exports = router;
