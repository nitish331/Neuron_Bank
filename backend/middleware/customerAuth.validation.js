const { body, validationResult } = require("express-validator");

const customerRegistrationValidation = [
  body("name")
    .isString()
    .withMessage("Name must be text")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .bail()
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters"),
  body("email")
    .isString()
    .withMessage("Email must be text")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .bail()
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
  body("phoneNumber")
    .isString()
    .withMessage("Phone number must be text")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Phone number is required")
    .bail()
    .matches(/^\+?[1-9]\d{9,14}$/)
    .withMessage(
      "Phone number must contain 10 to 15 digits and may start with +",
    ),
  body("dateOfBirth")
    .notEmpty()
    .withMessage("Date of birth is required")
    .bail()
    .isISO8601({ strict: true })
    .withMessage("Date of birth must be a valid date in YYYY-MM-DD format")
    .bail()
    .custom((value) => {
      if (new Date(value) > new Date()) {
        throw new Error("Date of birth cannot be in the future");
      }

      return true;
    })
    .toDate(),
  body("password")
    .isString()
    .withMessage("Password must be text")
    .bail()
    .notEmpty()
    .withMessage("Password is required")
    .bail()
    .isStrongPassword({
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    })
    .withMessage(
      "Password must be at least 8 characters and include uppercase, lowercase, number, and symbol",
    )
    .bail()
    .isLength({ max: 128 })
    .withMessage("Password must not exceed 128 characters"),
];

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map(({ path, msg }) => ({
        field: path,
        message: msg,
      })),
    });
  }

  return next();
}

module.exports = {
  customerRegistrationValidation,
  handleValidationErrors,
};
