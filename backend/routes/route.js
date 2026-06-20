const express = require("express");
const authRoutes = require("./auth.route");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to Neuron Banking API",
  });
});

router.use(authRoutes);

module.exports = router;
