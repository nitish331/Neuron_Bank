const express = require("express");
const {
  addBeneficiary,
  listBeneficiaries,
  sendBeneficiaryCode,
  updateBeneficiary,
  deleteBeneficiary,
} = require("../controllers/beneficiary.controller");
const { authenticate } = require("../middleware/auth.middleware");
const {
  addBeneficiaryValidation,
  sendBeneficiaryOtpValidation,
  updateBeneficiaryValidation,
  deleteBeneficiaryValidation,
} = require("../middleware/beneficiary.validation");
const { handleValidationErrors } = require("../middleware/auth.validation");

const router = express.Router();

router.get("/beneficiaries", authenticate, listBeneficiaries);

router.post(
  "/beneficiaries",
  authenticate,
  addBeneficiaryValidation,
  handleValidationErrors,
  addBeneficiary,
);

router.post(
  "/beneficiaries/:beneficiaryId/send-otp",
  authenticate,
  sendBeneficiaryOtpValidation,
  handleValidationErrors,
  sendBeneficiaryCode,
);

router.patch(
  "/beneficiaries/:beneficiaryId",
  authenticate,
  updateBeneficiaryValidation,
  handleValidationErrors,
  updateBeneficiary,
);

router.delete(
  "/beneficiaries/:beneficiaryId",
  authenticate,
  deleteBeneficiaryValidation,
  handleValidationErrors,
  deleteBeneficiary,
);

module.exports = router;
