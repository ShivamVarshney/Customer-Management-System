const express = require("express");
const Customer = require("../Models/Customer.js");
const protect = require("../Middleware/authMiddleware.js");

const router = express.Router();

router.use(protect);

router.get("/stats", async (req, res) => {
  try {
    const total = await Customer.countDocuments();

    const active = await Customer.countDocuments({
      status: "Active",
    });

    const pending = await Customer.countDocuments({
      status: "Pending",
    });

    const inactive = await Customer.countDocuments({
      status: "Inactive",
    });

    res.json({
      success: true,
      total,
      active,
      pending,
      inactive,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard stats",
    });
  }
});

module.exports = router;