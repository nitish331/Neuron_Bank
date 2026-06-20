const express = require("express");
const { registerCustomer } = require("../controllers/customerAuth.controller");
const {
  customerRegistrationValidation,
  handleValidationErrors,
} = require("../middleware/customerAuth.validation");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to Neuron Banking API",
  });
});

router.post(
  "/register",
  customerRegistrationValidation,
  handleValidationErrors,
  registerCustomer,
);

module.exports = router;
