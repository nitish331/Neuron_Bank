const { query } = require("express-validator");

const userAnalyticsValidation = [
  query("months")
    .optional()
    .isInt({ min: 1, max: 24 })
    .withMessage("Months must be between 1 and 24"),
];

module.exports = { userAnalyticsValidation };
