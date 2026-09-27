const express = require("express");
const authRoutes = require("./auth.route");
const verificationRoutes = require("./verification.route");
const transactionRoutes = require("./transaction.route");
const adminRoutes = require("./admin.route");
const loanRoutes = require("./loan.route");
const analyticsRoutes = require("./analytics.route");
const passwordRoutes = require("./password.route");
const debitCardRoutes = require("./debitCard.route");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to Neuron Banking API",
  });
});

router.use(authRoutes);
router.use(verificationRoutes);
router.use(transactionRoutes);
router.use(adminRoutes);
router.use(loanRoutes);
router.use(analyticsRoutes);
router.use(passwordRoutes);
router.use(debitCardRoutes);

module.exports = router;
