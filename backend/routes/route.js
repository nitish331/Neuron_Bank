const express = require("express");
const authRoutes = require("./auth.route");
const transactionRoutes = require("./transaction.route");
const adminRoutes = require("./admin.route");
const loanRoutes = require("./loan.route");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to Neuron Banking API",
  });
});

router.use(authRoutes);
router.use(transactionRoutes);
router.use(adminRoutes);
router.use(loanRoutes);

module.exports = router;
