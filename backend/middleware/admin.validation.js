const { param } = require("express-validator");

const approveAccountValidation = [
  param("accountId")
    .trim()
    .notEmpty()
    .withMessage("Account id is required")
    .bail()
    .isMongoId()
    .withMessage("Account id must be a valid id"),
];

module.exports = { approveAccountValidation };
