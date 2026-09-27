const express = require("express");
const { userAnalytics } = require("../controllers/analytics.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { userAnalyticsValidation } = require("../middleware/analytics.validation");
const { handleValidationErrors } = require("../middleware/auth.validation");

const router = express.Router();

router.get(
  "/user-analytics",
  authenticate,
  userAnalyticsValidation,
  handleValidationErrors,
  userAnalytics,
);

module.exports = router;
