const express = require("express");
const { createLoanRequest } = require("../controllers/loan.controller");
const { authenticate } = require("../middleware/auth.middleware");
const {
  createLoanRequestValidation,
} = require("../middleware/loan.validation");
const { handleValidationErrors } = require("../middleware/auth.validation");

const router = express.Router();

router.post(
  "/loan-requests",
  authenticate,
  createLoanRequestValidation,
  handleValidationErrors,
  createLoanRequest,
);

module.exports = router;
